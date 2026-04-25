package election.ems_backend.service.implement;

import election.ems_backend.dto.VoteTallyDto;
import election.ems_backend.entity.Election;
import election.ems_backend.entity.Organization;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.entity.VoteTally;
import election.ems_backend.enums.VoteStatus;
import election.ems_backend.mapper.VoteTallyMapper;
import election.ems_backend.repository.*;
import election.ems_backend.service.AdvisoryLockNotAcquiredException;
import election.ems_backend.service.VoteTallyService;
import election.ems_backend.utility.VoteTallySpecs;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.NOT_FOUND;

/**
 * VoteTallyService implementation.
 *
 * Key behavioral changes:
 *  - If the Postgres advisory lock cannot be acquired (pg_try_advisory_lock -> false),
 *    the method throws AdvisoryLockNotAcquiredException so callers/listeners can schedule retries.
 *  - Computation of tallies happens before deletes/inserts; delete/insert happen within the same transaction.
 */


@Service
@RequiredArgsConstructor
public class VoteTallyServiceImplementation implements VoteTallyService {


    private static final Logger log = LoggerFactory.getLogger(VoteTallyServiceImplementation.class);

    private final VoteTallyRepository voteTallyRepository;
    private final OrganizationRepository orgRepo;
    private final VoteSubmissionRepository voteSubmissionRepository;
    private final PartyRepository partyRepo;
    private final ElectionCandidateRepository electionCandidateRepository;
    private final SystemUserRepository systemUserRepo;
    private final ElectionRepository electionRepo;
    private final ContestRepository contestRepository;

    private final JdbcTemplate jdbc;

    private final VoteTallyMapper mapper = new VoteTallyMapper();


    // In-JVM guard to prevent concurrent recomputes for same org+election
    // NOTE: for multi-node deployments we also acquire a Postgres advisory lock.
    private static final ConcurrentHashMap<String, Object> RUN_LOCKS = new ConcurrentHashMap<>();


    @Override
    @Transactional(readOnly = true)
    public Page<VoteTallyDto> search(UUID orgId,
                                     UUID electionId,
                                     UUID electId,
                                     UUID partyId,
                                     UUID contestId,
                                     Pageable pageable) {

        Specification<VoteTally> spec = Specification
                .where(VoteTallySpecs.orgEquals(orgId))
                .and(VoteTallySpecs.electionEquals(electionId))
                .and(VoteTallySpecs.electEquals(electId))     // ✅ update spec
                .and(VoteTallySpecs.partyIdEquals(partyId))   // ✅ update spec (partyId column)
                .and(VoteTallySpecs.contestEquals(contestId));// ✅ update spec

        return voteTallyRepository.findAll(spec, pageable).map(mapper::toDTO);
    }



    /**
     * Convenience overload – system recompute (no explicit user).
     */
    @Override
    @Transactional
    public List<VoteTallyDto> recomputeForElection(UUID orgId, UUID electionId) {
        return recomputeForElection(orgId, electionId, null);
    }




    /**
     * Recompute aggregated vote totals for an election using VERIFIED submissions only.
     *
     * This method:
     *  - acquires an in-JVM guard and a Postgres advisory lock (pg_try_advisory_lock) to avoid concurrent runs
     *  - performs a set-based aggregation in the DB from vote_submission.candidate_votes (jsonb)
     *  - deletes existing tallies for the org+election and inserts new tallies in a single transaction
     *
     * Note:
     *  - If the advisory lock cannot be acquired because another node is running a recompute,
     *    this call returns an empty list and logs a warning.
     *  - The SQL filters candidate_votes values that are not strictly numeric to avoid runtime cast exceptions.
     */
    @Override
    @Transactional
    public List<VoteTallyDto> recomputeForElection(UUID orgId,
                                                   UUID electionId,
                                                   UUID recomputedByUserId) {

        Organization org = orgRepo.findById(orgId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Organization not found"));

        String lockKey = orgId + ":" + electionId;
        Object existing = RUN_LOCKS.putIfAbsent(lockKey, new Object());
        if (existing != null) {
            log.warn("Recompute for org={} election={} already in progress (in-JVM). Skipping.",
                    orgId, electionId);
            return List.of();
        }

        boolean advisoryLockAcquired = false;
        long advisoryKey = computeAdvisoryKey(orgId, electionId);

        try {
            try {
                Boolean got = jdbc.queryForObject("SELECT pg_try_advisory_lock(?)", Boolean.class, advisoryKey);
                advisoryLockAcquired = Boolean.TRUE.equals(got);
                if (!advisoryLockAcquired) {
                    throw new AdvisoryLockNotAcquiredException(
                            "Another node holds advisory lock for org=" + orgId + " election=" + electionId
                    );
                }
            } catch (AdvisoryLockNotAcquiredException ex) {
                throw ex;
            } catch (Exception e) {
                log.warn("pg_try_advisory_lock unavailable, using JVM guard only: {}", e.getMessage());
            }

            long verifiedCount = voteSubmissionRepository
                    .findByOrganization_OrgIdAndElection_ElectionIdAndStatus(
                            orgId, electionId, VoteStatus.VERIFIED)
                    .size();

            log.info("DEBUG: recomputeForElection org={} election={} -> {} VERIFIED submissions",
                    orgId, electionId, verifiedCount);

            /*
             * FINAL TRUTH:
             * - candidate_votes JSON key = elect_id
             * - contest_option validates candidate belongs to contest
             * - election_candidate maps elect_id -> candidate_id
             * - candidate.party_id is the ONLY party source (NULL => Independent)
             *
             * RULE:
             * - Party candidates must be in election_party and qualified
             * - Independent candidates (party_id NULL) must still be counted
             */

            String sql = """
            SELECT
                s.contest_id::uuid       AS contest_id,
                (e.key)::uuid            AS elect_id,
                c.party_id::uuid         AS party_id,
                SUM((e.value)::int)      AS votes
            FROM vote_submission s
            CROSS JOIN LATERAL jsonb_each_text(s.candidate_votes) AS e(key, value)

            JOIN contest_option co
              ON co.contest_id  = s.contest_id
             AND co.election_id = s.election_id
             AND co.is_active   = true
             AND co.option_type = 'CANDIDATE'
             AND co.elect_id    = (e.key)::uuid

            JOIN election_candidate ec
              ON ec.elect_id    = (e.key)::uuid
             AND ec.election_id = s.election_id

            JOIN candidate c
              ON c.candidate_id = ec.candidate_id

            -- ✅ Party validation for party candidates only (independents pass through)
            LEFT JOIN election_party ep
              ON ep.election_id = s.election_id
             AND ep.party_id    = c.party_id

            WHERE s.org_id = ?
              AND s.election_id = ?
              AND s.status = ?
              AND e.value ~ '^[0-9]+$'
              AND (
                   c.party_id IS NULL
                   OR (ep.party_id IS NOT NULL AND ep.is_qualified = true)
              )

            GROUP BY s.contest_id, (e.key)::uuid, c.party_id
        """;

            List<Map<String, Object>> rows =
                    jdbc.queryForList(sql, orgId, electionId, VoteStatus.VERIFIED.name());

            log.info("DEBUG: recomputeForElection produced {} tally rows", rows.size());

            voteTallyRepository.deleteByOrgAndElection(orgId, electionId);

            if (rows.isEmpty()) {
                log.warn("Recompute produced 0 rows despite VERIFIED submissions={}", verifiedCount);
                return List.of();
            }

            Election election = electionRepo.findById(electionId).orElseGet(() -> {
                Election e = new Election();
                e.setElectionId(electionId);
                return e;
            });

            SystemUser recomputedBy = (recomputedByUserId == null) ? null :
                    systemUserRepo.findById(recomputedByUserId)
                            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Recomputed-by user not found"));

            LocalDateTime now = LocalDateTime.now();
            List<VoteTally> toSave = new ArrayList<>(rows.size());

            for (Map<String, Object> r : rows) {
                Object contestObj = r.get("contest_id");
                Object electObj   = r.get("elect_id");
                Object partyObj   = r.get("party_id");
                Object votesObj   = r.get("votes");

                if (contestObj == null || electObj == null || votesObj == null) {
                    log.warn("Skipping invalid tally row (missing required fields): {}", r);
                    continue;
                }

                UUID contestId = UUID.fromString(contestObj.toString());
                UUID electId   = UUID.fromString(electObj.toString());

                // ✅ Independent candidate => party_id is NULL
                UUID partyId = (partyObj == null) ? null : UUID.fromString(partyObj.toString());

                int votes = ((Number) votesObj).intValue();

                VoteTally v = new VoteTally();
                v.setOrganization(org);
                v.setElection(election);

                // ✅ WRITE-SAFE COLUMNS
                v.setContestId(contestId);
                v.setElectId(electId);
                v.setPartyId(partyId); // can be null for independents

                v.setVoteCount(votes);
                v.setLastRecomputedAt(now);
                v.setRecomputedBy(recomputedBy);

                toSave.add(v);
            }

            if (toSave.isEmpty()) {
                log.warn("Recompute produced rows but none were writeable after validation.");
                return List.of();
            }

            List<VoteTally> saved = voteTallyRepository.saveAll(toSave);
            return saved.stream().map(mapper::toDTO).toList();

        } finally {
            if (advisoryLockAcquired) {
                try {
                    jdbc.queryForObject("SELECT pg_advisory_unlock(?)", Boolean.class, advisoryKey);
                } catch (Exception ignored) {}
            }
            RUN_LOCKS.remove(lockKey);
        }
    }



    // ------------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------------
    private long computeAdvisoryKey(UUID orgId, UUID electionId) {
        UUID combined = UUID.nameUUIDFromBytes((orgId.toString() + "|" + electionId.toString())
                .getBytes(StandardCharsets.UTF_8));
        return combined.getMostSignificantBits() ^ combined.getLeastSignificantBits();
    }


}
