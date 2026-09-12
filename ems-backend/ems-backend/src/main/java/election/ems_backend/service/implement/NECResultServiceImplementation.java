package election.ems_backend.service.implement;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import election.ems_backend.dto.*;
import election.ems_backend.entity.*;
import election.ems_backend.enums.ChangeType;
import election.ems_backend.enums.OrganizationType;
import election.ems_backend.integration.SigningService;
import election.ems_backend.mapper.NECResultMapper;
import election.ems_backend.nec.NecResultPublishRequest;
import election.ems_backend.repository.*;
import election.ems_backend.service.AuditLogService;
import election.ems_backend.service.NECResultService;
import election.ems_backend.utility.NECResultSpecs;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
public class NECResultServiceImplementation implements NECResultService {

    private final JdbcTemplate jdbc;
    private final SystemUserRepository systemUserRepository;
    private final NECResultRepository resultRepo;
    private final ElectionRepository electionRepo;
    private final OrganizationRepository organizationRepository;
    private final ContestRepository contestRepository;
    private final PollingCenterRepository centerRepo;
    private final PollingCenterAllocationRepository allocationRepo;
    private final ContestRepository contestRepo;
    private final  VoteSubmissionRepository voteSubmissionRepository;
    private final SigningService signingService;
    private final NecResultHistoryRepository necHistoryRepo;
    private final AuditLogService auditLogService;


    private final NECResultMapper mapper = new NECResultMapper();

    private static final Logger log = LoggerFactory.getLogger(NECResultServiceImplementation.class);
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    private static final Map<String, Object> RUN_LOCKS = new ConcurrentHashMap<>();





    // ✅ FINAL CODE (AS REQUESTED)

    // =========================
    // PUBLISH (CANONICAL)
    // =========================
    @Override
    @Transactional
    public NECResult publishForCenterContest(UUID electionId,
                                             UUID contestId,
                                             UUID centerId,
                                             NecResultPublishRequest req) {

        if (electionId == null) throw new ResponseStatusException(BAD_REQUEST, "electionId is required");
        if (contestId == null) throw new ResponseStatusException(BAD_REQUEST, "contestId is required");
        if (centerId == null) throw new ResponseStatusException(BAD_REQUEST, "centerId is required");
        if (req == null) throw new ResponseStatusException(BAD_REQUEST, "Request body is required");
        if (req.getActorUserId() == null) throw new ResponseStatusException(BAD_REQUEST, "actorUserId is required");
        if (req.getPublishedUntil() == null) throw new ResponseStatusException(BAD_REQUEST, "publishedUntil is required");

        LocalDateTime now = LocalDateTime.now();
        if (!req.getPublishedUntil().isAfter(now)) {
            throw new ResponseStatusException(BAD_REQUEST, "publishedUntil must be in the future");
        }

        NECResult nr = resultRepo
                .findByElection_ElectionIdAndContest_ContestIdAndPollingCenter_CenterId(
                        electionId, contestId, centerId
                )
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "NECResult not found"));

        // ✅ Idempotent publish
        if (Boolean.TRUE.equals(nr.isPublished())
                && nr.getPublishedUntil() != null
                && !nr.getPublishedUntil().isBefore(req.getPublishedUntil())) {
            return nr;
        }

        boolean wasPublished = Boolean.TRUE.equals(nr.isPublished());
        LocalDateTime prevUntil = nr.getPublishedUntil();

        nr.setPublished(true);
        nr.setPublishedAt(now);
        nr.setPublishedUntil(req.getPublishedUntil());
        nr = resultRepo.saveAndFlush(nr);

        // ✅ Ledger (your existing function must match audit_ledger schema)
        String payloadHash = buildNecResultPayloadHash(nr);

        Map<String, Object> ledgerRes = jdbc.queryForMap(
                "SELECT * FROM fn_log_ledger_and_update_nec_result(?, ?, ?, ?)",
                "NEC_RESULT_PUBLISH",
                nr.getResultId(),
                payloadHash,
                req.getActorUserId()
        );

        String chainHash = String.valueOf(ledgerRes.get("chain_hash"));

        SigningService.SignResult signResult = signingService.signHex(chainHash);

        jdbc.update(
                "UPDATE audit_ledger SET signature = ? WHERE ledger_id = ?",
                signResult.signature(),
                ledgerRes.get("ledger_id")
        );

        jdbc.update("""
        UPDATE nec_result
           SET result_signature = ?,
               result_signer_key_id = ?,
               chain_hash = ?
         WHERE result_id = ?
    """, signResult.signature(), signResult.keyId(), chainHash, nr.getResultId());

        nr.setResultSignature(signResult.signature());
        nr.setResultSignerKeyId(signResult.keyId());
        nr.setChainHash(chainHash);

        // ✅ HISTORY
        boolean extended = wasPublished && prevUntil != null && prevUntil.isBefore(req.getPublishedUntil());

        writeHistory(
                nr,
                ChangeType.PUBLISHED,
                req.getActorUserId(),
                (extended ? "PUBLISHED (EXTENDED)" : "PUBLISHED")
                        + ": publishedUntil=" + req.getPublishedUntil()
        );

        // ✅ AUDIT LOG — FIXED (NEC ORG)
        UUID necOrgId = resolveNecOrgIdOrThrow();

        auditLogService.logUpdate(
                necOrgId,
                req.getActorUserId(),
                "NECResult",
                "Published NEC result: resultId=" + nr.getResultId()
                        + ", electionId=" + electionId
                        + ", contestId=" + contestId
                        + ", centerId=" + centerId
                        + ", publishedUntil=" + req.getPublishedUntil()
                        + (extended ? " (EXTENDED)" : "")
        );

        return nr;
    }

    // =========================
    // BATCH PUBLISH (ELECTION)
    // =========================
    @Override
    @Transactional
    public int publishElection(UUID electionId, NecResultPublishRequest req) {
        if (electionId == null) throw new ResponseStatusException(BAD_REQUEST, "electionId is required");
        if (req == null) throw new ResponseStatusException(BAD_REQUEST, "Request body is required");
        if (req.getActorUserId() == null) throw new ResponseStatusException(BAD_REQUEST, "actorUserId is required");
        if (req.getPublishedUntil() == null) throw new ResponseStatusException(BAD_REQUEST, "publishedUntil is required");

        List<NECResult> all = resultRepo.findByElection_ElectionId(electionId);

        int changed = 0;
        UUID necOrgId = resolveNecOrgIdOrThrow();

        for (NECResult nr : all) {

            // publish does idempotency internally
            NECResult updated = publishForCenterContest(
                    nr.getElection().getElectionId(),
                    nr.getContest().getContestId(),
                    nr.getPollingCenter().getCenterId(),
                    req
            );

            // count only if it is published AND has exactly the requested publishedUntil
            if (Boolean.TRUE.equals(updated.isPublished())
                    && updated.getPublishedUntil() != null
                    && updated.getPublishedUntil().equals(req.getPublishedUntil())) {
                changed++;
            }
        }

        safeAudit(
                necOrgId,
                req.getActorUserId(),
                "NECResult",
                "Batch published election results: electionId=" + electionId
                        + ", changedCount=" + changed
                        + ", publishedUntil=" + req.getPublishedUntil()
        );

        return changed;
    }



    // =========================
// UNPUBLISH (CANONICAL)
// =========================
    @Override
    @Transactional
    public NECResult unpublishForCenterContest(UUID electionId,
                                               UUID contestId,
                                               UUID centerId,
                                               UUID actorUserId,
                                               String reason) {

        if (electionId == null) throw new ResponseStatusException(BAD_REQUEST, "electionId is required");
        if (contestId == null) throw new ResponseStatusException(BAD_REQUEST, "contestId is required");
        if (centerId == null) throw new ResponseStatusException(BAD_REQUEST, "centerId is required");
        if (actorUserId == null) throw new ResponseStatusException(BAD_REQUEST, "actorUserId is required");

        NECResult nr = resultRepo
                .findByElection_ElectionIdAndContest_ContestIdAndPollingCenter_CenterId(
                        electionId, contestId, centerId
                )
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "NECResult not found"));

        // idempotent
        if (!Boolean.TRUE.equals(nr.isPublished())) return nr;

        LocalDateTime now = LocalDateTime.now();

        nr.setPublished(false);
        nr.setPublishedAt(null);
        nr.setPublishedUntil(null);
        nr = resultRepo.saveAndFlush(nr);

        String payloadHash = buildNecResultPayloadHash(nr);

        logLedgerAndSignNecResult("NEC_RESULT_UNPUBLISH", nr, actorUserId, payloadHash);

        // ✅ classify change type using your enum
        final String userNote = (reason == null ? null : reason.trim());
        final boolean isExpired = userNote != null && userNote.equalsIgnoreCase("AUTO_EXPIRED");

        final ChangeType changeType = isExpired
                ? ChangeType.UNPUBLISHED_EXPIRED
                : ChangeType.UNPUBLISHED_MANUAL;

        // ✅ IMPORTANT: call the 5-arg overload so userNote is saved
        writeHistory(
                nr,
                changeType,
                actorUserId,
                "UNPUBLISHED: reason=" + (userNote == null ? "N/A" : userNote) + ", at=" + now,
                userNote
        );

        UUID necOrgId = resolveNecOrgIdOrThrow();
        safeAudit(
                necOrgId,
                actorUserId,
                "NECResult",
                "Unpublished NEC result: resultId=" + nr.getResultId()
                        + ", electionId=" + electionId
                        + ", contestId=" + contestId
                        + ", centerId=" + centerId
                        + ", reason=" + (userNote == null ? "N/A" : userNote)
        );

        return nr;
    }



    // =========================
    // BATCH UNPUBLISH (ELECTION)
    // =========================
    @Override
    @Transactional
    public int unpublishElection(UUID electionId, UUID actorUserId, String reason) {
        if (electionId == null) throw new ResponseStatusException(BAD_REQUEST, "electionId is required");
        if (actorUserId == null) throw new ResponseStatusException(BAD_REQUEST, "actorUserId is required");

        List<NECResult> all = resultRepo.findByElection_ElectionId(electionId);

        int changed = 0;
        UUID necOrgId = resolveNecOrgIdOrThrow();

        for (NECResult nr : all) {
            if (Boolean.TRUE.equals(nr.isPublished())) {
                unpublishForCenterContest(
                        nr.getElection().getElectionId(),
                        nr.getContest().getContestId(),
                        nr.getPollingCenter().getCenterId(),
                        actorUserId,
                        reason
                );
                changed++;
            }
        }

        safeAudit(
                necOrgId,
                actorUserId,
                "NECResult",
                "Batch unpublished election results: electionId=" + electionId
                        + ", changedCount=" + changed
                        + ", reason=" + (reason == null ? "N/A" : reason)
        );

        return changed;
    }
    // =========================
    // AUTO UNPUBLISH (SCHEDULED)
    // =========================
    @Scheduled(fixedDelay = 60_000)
    public void autoUnpublishExpiredJob() {
        autoUnpublishExpired(LocalDateTime.now());
    }

    @Override
    @Transactional
    public int autoUnpublishExpired(LocalDateTime nowUtcOrLocal) {
        LocalDateTime now = (nowUtcOrLocal != null) ? nowUtcOrLocal : LocalDateTime.now();

        List<UUID> expiredIds = resultRepo.findExpiredPublishedResultIds(now);
        if (expiredIds.isEmpty()) return 0;

        UUID systemActorUserId = resolveSystemActorUserId();

        int count = 0;
        for (UUID resultId : expiredIds) {
            NECResult nr = resultRepo.findById(resultId).orElse(null);
            if (nr == null) continue;

            // canonical unpublish; reason is "AUTO_EXPIRED"
            unpublishForCenterContest(
                    nr.getElection().getElectionId(),
                    nr.getContest().getContestId(),
                    nr.getPollingCenter().getCenterId(),
                    systemActorUserId,
                    "AUTO_EXPIRED"
            );
            count++;
        }
        return count;
    }

    private UUID resolveSystemActorUserId() {
        return systemUserRepository.findByUserNameIgnoreCase("SYSTEM")
                .orElseThrow(() -> new IllegalStateException(
                        "SYSTEM user not found in system_user table. Create username='SYSTEM' for automated actions."
                ))
                .getUserId();
    }

    // inside NECResultServiceImplementation

    private UUID resolveNecOrgIdOrThrow() {
        return organizationRepository
                .findFirstByOrganizationType(OrganizationType.NEC)
                .orElseThrow(() -> new IllegalStateException(
                        "NEC organization not found. Ensure organization table has a row with organization_type='NEC'."
                ))
                .getOrgId();
    }


    private void safeAudit(UUID orgId, UUID actorUserId, String entity, String msg) {
        // In prod, publishing should not fail if audit log has a config/data issue
        try {
            if (orgId != null) {
                auditLogService.logUpdate(orgId, actorUserId, entity, msg);
            } else {
                log.warn("Skipping audit_log insert: orgId could not be resolved. msg={}", msg);
            }
        } catch (Exception ex) {
            log.error("Audit log failed (non-blocking): {}", ex.getMessage(), ex);
        }
    }

    private void logLedgerAndSignNecResult(String eventType,
                                           NECResult nr,
                                           UUID actorUserId,
                                           String payloadHash) {

        // ✅ Use your actual DB function signature:
        // fn_log_ledger_and_update_nec_result(text, uuid, text, uuid)
        // (entry_type, result_id, payload_hash, actor_id)
        Map<String, Object> ledgerRes = jdbc.queryForMap(
                """
                SELECT * FROM fn_log_ledger_and_update_nec_result(
                  ?::text,
                  ?::uuid,
                  ?::text,
                  ?::uuid
                )
                """,
                eventType,
                nr.getResultId(),
                payloadHash,
                actorUserId
        );

        UUID ledgerId = toUuid(ledgerRes.get("ledger_id"));
        String chainHash = ledgerRes.get("chain_hash") != null ? String.valueOf(ledgerRes.get("chain_hash")) : null;

        if (chainHash == null || chainHash.isBlank()) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
                    "Missing chain_hash from ledger function");
        }

        SigningService.SignResult signResult = signingService.signHex(chainHash);

        jdbc.update(
                "UPDATE audit_ledger SET signature = ? WHERE ledger_id = ?",
                signResult.signature(),
                ledgerId
        );

        jdbc.update("""
            UPDATE nec_result
               SET result_signature = ?,
                   result_signer_key_id = ?,
                   chain_hash = ?
             WHERE result_id = ?
        """, signResult.signature(), signResult.keyId(), chainHash, nr.getResultId());

        nr.setResultSignature(signResult.signature());
        nr.setResultSignerKeyId(signResult.keyId());
        nr.setChainHash(chainHash);
    }


    @Override
    @Transactional(readOnly = true)
    public boolean isElectionPublished(UUID electionId, UUID contestId) {
        return resultRepo.existsPublished(electionId, contestId);
    }


    @Override
    @Transactional(readOnly = true)
    public boolean isPublishedForCenterContest(UUID electionId, UUID contestId, UUID centerId) {
        if (electionId == null || contestId == null || centerId == null) return false;

        return resultRepo.existsByElection_ElectionIdAndContest_ContestIdAndPollingCenter_CenterIdAndIsPublishedTrue(
                electionId, contestId, centerId
        );
    }


    // ---------------------------------------------------------------------
// ✅ small helper (keep near recompute methods)
// ---------------------------------------------------------------------
    private String cleanUserNote(String userNote) {
        if (userNote == null) return null;
        String s = userNote.trim();
        return s.isEmpty() ? null : s;
    }


// ---------------------------------------------------------------------
// ✅ 1) recomputeFromSubmission + recomputeFromSubmissionWithNotes
// ---------------------------------------------------------------------

    @Override
    @Transactional
    public void recomputeFromSubmission(UUID submissionId, UUID recomputedByUserId) {
        // keep existing behavior but route through the new overload
        recomputeFromSubmissionWithNotes(submissionId, recomputedByUserId, null);
    }

    /**
     * ✅ NEW: recomputeFromSubmissionWithNotes
     * - Same scope derivation
     * - Same recompute logic
     * - Only difference: can pass user note/reason/comment that gets stored in history.user_note
     */
    @Transactional
    public void recomputeFromSubmissionWithNotes(UUID submissionId,
                                                 UUID recomputedByUserId,
                                                 String userNote) {

        if (submissionId == null) throw new ResponseStatusException(BAD_REQUEST, "submissionId is required");

        VoteSubmission s = voteSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Submission not found"));

        if (s.getOrganization() == null || s.getOrganization().getOrgId() == null)
            throw new ResponseStatusException(BAD_REQUEST, "Submission missing orgId");
        if (s.getElection() == null || s.getElection().getElectionId() == null)
            throw new ResponseStatusException(BAD_REQUEST, "Submission missing electionId");
        if (s.getContestId() == null)
            throw new ResponseStatusException(BAD_REQUEST, "Submission missing contestId");

        UUID centerId = null;
        if (s.getPollingCenter() != null) centerId = s.getPollingCenter().getCenterId();
        if (centerId == null && s.getPollingPlace() != null && s.getPollingPlace().getPollingCenter() != null) {
            centerId = s.getPollingPlace().getPollingCenter().getCenterId();
        }
        if (centerId == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Submission missing centerId (center_id/place->center)");
        }

        UUID necOrgId = s.getOrganization().getOrgId();
        UUID electionId = s.getElection().getElectionId();
        UUID contestId = s.getContestId();

        String cleaned = cleanUserNote(userNote);

        log.info("NEC recomputeFromSubmission scope -> submissionId={} status={} election={} contest={} center={} userNotePresent={}",
                submissionId, s.getStatus(), electionId, contestId, centerId, cleaned != null);

        // ✅ IMPORTANT: note enters recompute -> history path here
        recomputeForCenterContestInternal(necOrgId, electionId, contestId, centerId, recomputedByUserId, cleaned);
    }


    @Override
    @Transactional
    public void recomputeForCenterContest(UUID necOrgId,
                                          UUID electionId,
                                          UUID contestId,
                                          UUID centerId,
                                          UUID recomputedByUserId) {
        recomputeForCenterContestInternal(necOrgId, electionId, contestId, centerId, recomputedByUserId, null);
    }

    @Override
    @Transactional
    public void recomputeForCenterContestWithNotes(UUID necOrgId,
                                                   UUID electionId,
                                                   UUID contestId,
                                                   UUID centerId,
                                                   UUID recomputedByUserId,
                                                   String userNote) {
        recomputeForCenterContestInternal(necOrgId, electionId, contestId, centerId, recomputedByUserId, cleanUserNote(userNote));
    }


    private void recomputeForCenterContestInternal(UUID necOrgId,
                                                   UUID electionId,
                                                   UUID contestId,
                                                   UUID centerId,
                                                   UUID recomputedByUserId,
                                                   String userNote) {

        if (necOrgId == null) throw new ResponseStatusException(BAD_REQUEST, "necOrgId is required");
        if (electionId == null) throw new ResponseStatusException(BAD_REQUEST, "electionId is required");
        if (contestId == null) throw new ResponseStatusException(BAD_REQUEST, "contestId is required");
        if (centerId == null) throw new ResponseStatusException(BAD_REQUEST, "centerId is required");

        log.info("NEC recompute ENTER necOrgId={} electionId={} contestId={} centerId={} userNotePresent={}",
                necOrgId, electionId, contestId, centerId, userNote != null);

        Election election = electionRepo.findById(electionId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Election not found"));
        Contest contest = contestRepo.findById(contestId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Contest not found"));
        PollingCenter center = centerRepo.findById(centerId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Polling center not found"));


        // ✅ HARD FREEZE: Never recompute if already published
        // Published official result must remain immutable until unpublished.
        if (resultRepo.existsByElection_ElectionIdAndContest_ContestIdAndPollingCenter_CenterIdAndIsPublishedTrue(
                electionId, contestId, centerId
        )) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Cannot recompute NECResult: official result is already published for this contest/center. Unpublish first."
            );
        }


        // 1) Count NEC-verified submissions for this scope (same logic)
        Long verifiedCount = jdbc.queryForObject("""
    SELECT COUNT(*)
    FROM vote_submission s
    LEFT JOIN polling_place pp ON pp.place_id = s.place_id
    WHERE s.org_id = ?
      AND s.election_id = ?
      AND s.contest_id = ?
      AND (
            s.center_id = ?
            OR pp.center_id = ?
      )
      AND s.status = 'VERIFIED'
      AND s.date_deleted IS NULL
    """, Long.class,
                necOrgId, electionId, contestId,
                centerId, centerId
        );

        long vc = verifiedCount == null ? 0L : verifiedCount;
        log.info("NEC recompute verifiedCount={}", vc);

        // ---------------------------------------------------------------------
        // ✅ 2) If none, delete global NECResult row
        //     IMPORTANT: delete MUST NOT be blocked by audit log failures.
        // ---------------------------------------------------------------------
        if (vc == 0L) {

            resultRepo.findByElection_ElectionIdAndContest_ContestIdAndPollingCenter_CenterId(
                            electionId, contestId, centerId
                    )
                    .ifPresent(existing -> {

                        // ✅ HISTORY (protected already by try/catch inside writeHistory)
                        writeHistory(
                                existing,
                                ChangeType.CLEARED,
                                recomputedByUserId,
                                "AUTO_RECOMPUTE_DELETE: verifiedCount=0",
                                userNote
                        );

                        // ✅ CORE correctness: delete FIRST
                        resultRepo.delete(existing);

                        log.info("NECResult deleted (no NEC verified submissions) election={} contest={} center={}",
                                electionId, contestId, centerId);

                        // ✅ AUDIT must NOT prevent delete
                        try {
                            auditLogService.logDelete(
                                    necOrgId,
                                    recomputedByUserId,
                                    "NECResult",
                                    "Auto recompute deleted NECResult: resultId=" + existing.getResultId() +
                                            ", electionId=" + electionId +
                                            ", contestId=" + contestId +
                                            ", centerId=" + centerId +
                                            ", verifiedCount=0"
                            );
                        } catch (Exception ignore) {
                            log.warn("NEC audit delete failed (ignored): {}", ignore.getMessage());
                        }
                    });

            return;
        }

        // 3) Registered voters (same behavior)
        Integer totalRegisteredVoters = jdbc.queryForObject("""
    SELECT COALESCE(SUM(ppa.registered_voters), 0)
    FROM polling_place_allocation ppa
    JOIN polling_place pp ON pp.place_id = ppa.place_id
    WHERE ppa.election_id = ?
      AND pp.center_id = ?
      AND ppa.is_active = true
    """, Integer.class, electionId, centerId);

        if (totalRegisteredVoters == null) totalRegisteredVoters = 0;

        // 4) Aggregate (BIG SQL unchanged)
        Map<String, Object> agg = jdbc.queryForMap("""
    WITH scope_submissions AS (
        SELECT s.*
        FROM vote_submission s
        LEFT JOIN polling_place pp ON pp.place_id = s.place_id
        WHERE s.org_id = ?
          AND s.election_id = ?
          AND s.contest_id = ?
          AND (
                s.center_id = ?
                OR pp.center_id = ?
          )
          AND s.status = 'VERIFIED'
          AND s.date_deleted IS NULL
    ),
    exploded AS (
        SELECT
            (e.key)::uuid AS elect_id,
            (e.value)::int AS votes,
            COALESCE(s.ballots_cast, 0)           AS ballots_cast,
            COALESCE(s.invalid_ballots, 0)        AS invalid_ballots,
            COALESCE(s.unmarked_ballots, 0)       AS unmarked_ballots,
            COALESCE(s.rejected_ballots, 0)       AS rejected_ballots,
            COALESCE(s.spoiled_ballots, 0)        AS spoiled_ballots,
            COALESCE(s.unused_ballots, 0)         AS unused_ballots
        FROM scope_submissions s
        CROSS JOIN LATERAL jsonb_each_text(s.candidate_votes) AS e(key, value)
        WHERE e.value ~ '^[0-9]+$'
    ),
    scoped AS (
        SELECT
            x.elect_id,
            SUM(x.votes)::int AS total_votes
        FROM exploded x
        JOIN contest_option co
          ON co.contest_id  = ?
         AND co.election_id = ?
         AND co.is_active   = true
         AND co.option_type = 'CANDIDATE'
         AND co.elect_id    = x.elect_id
        GROUP BY x.elect_id
    ),
    totals AS (
        SELECT
            SUM(ballots_cast)::int     AS ballots_cast,
            SUM(invalid_ballots)::int  AS invalid_ballots,
            SUM(unmarked_ballots)::int AS unmarked_ballots,
            SUM(rejected_ballots)::int AS rejected_ballots,
            SUM(spoiled_ballots)::int  AS spoiled_ballots,
            SUM(unused_ballots)::int   AS unused_ballots
        FROM (
            SELECT DISTINCT ballots_cast, invalid_ballots, unmarked_ballots,
                            rejected_ballots, spoiled_ballots, unused_ballots
            FROM exploded
        ) d
    )
    SELECT
        (SELECT COALESCE(jsonb_object_agg(sc.elect_id::text, sc.total_votes), '{}'::jsonb)
         FROM scoped sc) AS candidate_votes_json,
        t.ballots_cast,
        t.invalid_ballots,
        t.unmarked_ballots,
        t.rejected_ballots,
        t.spoiled_ballots,
        t.unused_ballots
    FROM totals t
    """,
                necOrgId, electionId, contestId,
                centerId, centerId,
                contestId, electionId
        );

        // parse jsonb -> JsonNode (same logic)
        JsonNode candidateVotesNode;
        try {
            String json = String.valueOf(agg.get("candidate_votes_json"));
            candidateVotesNode = objectMapper.readTree(json);
        } catch (Exception ex) {
            log.warn("Failed to parse candidate_votes_json; defaulting to empty object. err={}", ex.getMessage());
            candidateVotesNode = objectMapper.createObjectNode();
        }

        int ballotsCast    = toInt(agg.get("ballots_cast"));
        int invalidBallots = toInt(agg.get("invalid_ballots"));
        int unmarked       = toInt(agg.get("unmarked_ballots"));
        int rejected       = toInt(agg.get("rejected_ballots"));
        int spoiled        = toInt(agg.get("spoiled_ballots"));
        int unused         = toInt(agg.get("unused_ballots"));

        // ✅ NEW: consume validateTally here (recompute canonical pipeline)
        long sumVotes = 0L;
        if (candidateVotesNode != null && candidateVotesNode.isObject()) {
            var it = candidateVotesNode.fields();
            while (it.hasNext()) {
                var e = it.next();
                JsonNode v = e.getValue();
                if (v != null && v.isNumber()) {
                    sumVotes += v.asLong();
                } else if (v != null && v.isTextual()) {
                    try {
                        sumVotes += Long.parseLong(v.asText());
                    } catch (Exception ignore) {
                        // keep behavior: invalid entries don't contribute
                    }
                }
            }
        }

        validateTallyInternal(
                sumVotes,
                invalidBallots,
                unmarked,
                rejected,
                spoiled,
                unused,
                ballotsCast,
                totalRegisteredVoters,
                null
        );

        // 5) Upsert (same behavior)
        Optional<NECResult> existingOpt =
                resultRepo.findByElection_ElectionIdAndContest_ContestIdAndPollingCenter_CenterId(
                        electionId, contestId, centerId
                );

        NECResult nr = existingOpt.orElseGet(NECResult::new);
        boolean isCreate = existingOpt.isEmpty();

        nr.setElection(election);
        nr.setContest(contest);
        nr.setPollingCenter(center);
        nr.setCandidateVotes(candidateVotesNode);
        nr.setTotalRegisteredVoters(totalRegisteredVoters);
        nr.setBallotsInBox(ballotsCast);
        nr.setInvalidBallots(invalidBallots);
        nr.setUnmarkedBallots(unmarked);
        nr.setRejectedBallots(rejected);
        nr.setSpoiledBallots(spoiled);
        nr.setUnusedBallots(unused);
        nr.setSource("AUTO_FROM_VERIFIED_NEC_SUBMISSIONS");
        nr.setUploadTime(LocalDateTime.now());
        nr.setPublished(false);
//        nr.setIsPublished(false);
        nr.setPublishedAt(null);
        nr.setPublishedUntil(null);


        nr = resultRepo.save(nr);

        // ✅ HISTORY
        writeHistory(
                nr,
                ChangeType.RECOMPUTED,
                recomputedByUserId,
                "AUTO_RECOMPUTE: verifiedCount=" + vc,
                userNote
        );

        // ✅ AUDIT unchanged, but you can protect it similarly if you want
        if (isCreate) {
            auditLogService.logCreate(
                    necOrgId,
                    recomputedByUserId,
                    "NECResult",
                    "Auto recompute created NECResult: resultId=" + nr.getResultId() +
                            ", electionId=" + electionId +
                            ", contestId=" + contestId +
                            ", centerId=" + centerId +
                            ", verifiedCount=" + vc
            );
        } else {
            auditLogService.logUpdate(
                    necOrgId,
                    recomputedByUserId,
                    "NECResult",
                    "Auto recompute updated NECResult: resultId=" + nr.getResultId() +
                            ", electionId=" + electionId +
                            ", contestId=" + contestId +
                            ", centerId=" + centerId +
                            ", verifiedCount=" + vc
            );
        }

        log.info("NEC recompute OK -> nec_result updated election={} contest={} center={}",
                electionId, contestId, centerId);
    }


    // ✅ keep compatibility: old signature delegates to new one
    private void writeHistory(NECResult nr,
                              ChangeType changeType,
                              UUID changedBy,
                              String systemNotes) {
        writeHistory(nr, changeType, changedBy, systemNotes, null);
    }

    private void writeHistory(NECResult nr,
                              ChangeType changeType,
                              UUID changedBy,
                              String systemNotes,
                              String userNote) {
        try {
            NecResultHistory h = new NecResultHistory();
            h.setHistoryId(UUID.randomUUID());

            h.setResultId(nr.getResultId());
            h.setElectionId(nr.getElection() != null ? nr.getElection().getElectionId() : null);
            h.setContestId(nr.getContest() != null ? nr.getContest().getContestId() : null);
            h.setCenterId(nr.getPollingCenter() != null ? nr.getPollingCenter().getCenterId() : null);

            h.setCandidateVotes(nr.getCandidateVotes() == null
                    ? null
                    : objectMapper.convertValue(nr.getCandidateVotes(), Map.class));

            h.setTotalRegisteredVoters(nr.getTotalRegisteredVoters());
            h.setBallotsCast(nr.getBallotsInBox());

            h.setInvalidBallots(nr.getInvalidBallots());
            h.setUnmarkedBallots(nr.getUnmarkedBallots());
            h.setUnusedBallots(nr.getUnusedBallots());
            h.setRejectedBallots(nr.getRejectedBallots());
            h.setSpoiledBallots(nr.getSpoiledBallots());

            h.setChangeType(changeType);
            h.setChangedBy(changedBy);
            h.setDateChanged(LocalDateTime.now());

            h.setNotes(systemNotes); // auto/system
            h.setUserNote(cleanUserNote(userNote)); // ✅ user reason/comment

            log.info("NEC_HISTORY_WRITE changeType={} resultId={} systemNotes='{}' userNote='{}'",
                    changeType, nr.getResultId(), systemNotes, cleanUserNote(userNote));

            necHistoryRepo.save(h);

        } catch (Exception ex) {
            // ✅ CRITICAL: history must NEVER break recompute/publish
            log.warn("NEC history write failed (ignored): {}", ex.getMessage());
        }
    }


    @Override
    public NECResultDto get(UUID resultId) {
        return resultRepo.findById(resultId)
                .map(mapper::toDTO)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Result not found"));
    }

    @Override
    public Page<NECResultDto> search(UUID electionId, UUID centerId,
                                     LocalDateTime uploadedAfter, LocalDateTime uploadedBefore,
                                     Pageable pageable) {
        Specification<NECResult> spec = Specification
                .where(NECResultSpecs.electionEquals(electionId))
                .and(NECResultSpecs.centerEquals(centerId))
                .and(NECResultSpecs.uploadedAfter(uploadedAfter))
                .and(NECResultSpecs.uploadedBefore(uploadedBefore));

        return resultRepo.findAll(spec, pageable).map(mapper::toDTO);
    }


    // ---------- Rollups / Totals ----------

    @Override
    public NECOverallTotalsDto totals(UUID electionId, UUID centerId) {
        requireElection(electionId);
        Map<String, Object> scalars = resultRepo.sumScalarColumns(electionId, centerId);
        BigInteger candSum = resultRepo.sumAllCandidateVotes(electionId, centerId);

        long ballotsInBox     = toLong(scalars.get("ballots_cast"));
        long invalidBallots  = toLong(scalars.get("invalid_ballots"));
        long blankBallots    = toLong(scalars.get("blank_ballots"));
        long rejectedBallots = toLong(scalars.get("rejected_ballots"));
        long spoiledBallots  = toLong(scalars.get("spoiled_ballots"));
        long totalCandVotes  = candSum == null ? 0L : candSum.longValue();
        long registeredVoters= toLong(scalars.get("registered_voters")); // available if you want to surface

        return NECOverallTotalsDto.builder()
                .totalCandidateVotes(totalCandVotes)
                .ballotsCast(ballotsInBox)
                .invalidBallots(invalidBallots)
                .blankBallots(blankBallots)
                .rejectedBallots(rejectedBallots)
                .spoiledBallots(spoiledBallots)
                .build();
    }



    @Override
    public List<CandidateVoteTotalDto> totalsByCandidate(UUID electionId, UUID centerId) {
        requireElection(electionId);
        List<Object[]> rows = resultRepo.overallByCandidate(electionId, centerId);
        List<CandidateVoteTotalDto> out = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            out.add(new CandidateVoteTotalDto((UUID) r[0], toLong(r[1])));
        }
        return out;
    }


    @Override
    public List<CandidateScopedTotalDto> byCountyPerCandidate(UUID electionId) {
        requireElection(electionId);
        List<Object[]> rows = resultRepo.byCountyPerCandidate(electionId);

        Map<UUID, List<CandidateScopedTotalDto>> perCounty = new LinkedHashMap<>();
        Map<UUID, Long> countyRegistered = new HashMap<>();

        for (Object[] r : rows) {
            UUID countyId     = (UUID) r[0];
            String countyName = (String) r[1];
            UUID candidateId  = (UUID) r[2];
            long votes        = toLong(r[3]);
            long registered   = toLong(r[4]); // NEW

            perCounty.computeIfAbsent(countyId, k -> new ArrayList<>())
                    .add(new CandidateScopedTotalDto(candidateId, countyId, countyName, votes, 0,0,0,0,0, registered, 0.0));
            countyRegistered.merge(countyId, registered, Long::sum);
        }

        // compute pct per county using registered voters (fallback to vote-sum if registered is 0)
        perCounty.forEach((countyId, list) -> {
            long reg = countyRegistered.getOrDefault(countyId, 0L);
            double denom = reg > 0 ? reg : Math.max(1L, list.stream().mapToLong(CandidateScopedTotalDto::getVotes).sum());
            list.forEach(x -> x.setVoteSharePct(roundPct((x.getVotes() * 100.0) / denom)));
        });

        return perCounty.values().stream().flatMap(List::stream).toList();
    }


    @Override
    public List<CandidateScopedTotalDto> byDistrictPerCandidate(UUID electionId, UUID countyId) {
        requireElection(electionId);
        List<Object[]> rows = resultRepo.byDistrictPerCandidate(electionId, countyId);

        Map<UUID, List<CandidateScopedTotalDto>> perDistrict = new LinkedHashMap<>();
        Map<UUID, Long> districtRegistered = new HashMap<>();

        for (Object[] r : rows) {
            UUID districtId   = (UUID) r[0];
            String name       = (String) r[1];
            UUID candidateId  = (UUID) r[2];
            long votes        = toLong(r[3]);
            long registered   = toLong(r[4]); // NEW

            perDistrict.computeIfAbsent(districtId, k -> new ArrayList<>())
                    .add(new CandidateScopedTotalDto(candidateId, districtId, name, votes, 0,0,0,0,0, registered, 0.0));
            districtRegistered.merge(districtId, registered, Long::sum);
        }

        perDistrict.forEach((distId, list) -> {
            long reg = districtRegistered.getOrDefault(distId, 0L);
            double denom = reg > 0 ? reg : Math.max(1L, list.stream().mapToLong(CandidateScopedTotalDto::getVotes).sum());
            list.forEach(x -> x.setVoteSharePct(roundPct((x.getVotes() * 100.0) / denom)));
        });

        return perDistrict.values().stream().flatMap(List::stream).toList();
    }


    @Override
    public List<CandidateDailyTotalDto> dailyByCandidate(UUID electionId) {
        requireElection(electionId);
        List<Object[]> rows = resultRepo.dailyByCandidate(electionId);

        Map<LocalDate, List<CandidateDailyTotalDto>> perDay = new LinkedHashMap<>();
        Map<LocalDate, Long> dayRegistered = new HashMap<>();

        for (Object[] r : rows) {
            LocalDate day    = ((java.sql.Date) r[0]).toLocalDate();
            UUID candidateId = (UUID) r[1];
            long votes       = toLong(r[2]);
            long ballotsCast = (r.length > 3) ? toLong(r[3]) : 0L;
            long registered  = (r.length > 4) ? toLong(r[4]) : 0L; // NEW

            perDay.computeIfAbsent(day, k -> new ArrayList<>())
                    .add(new CandidateDailyTotalDto(candidateId, day, votes, ballotsCast, registered, 0.0));
            dayRegistered.merge(day, registered, Long::sum);
        }

        perDay.forEach((day, list) -> {
            long reg = dayRegistered.getOrDefault(day, 0L);
            double denom = reg > 0 ? reg : Math.max(1L, list.stream().mapToLong(CandidateDailyTotalDto::getVotes).sum());
            list.forEach(it -> it.setVoteSharePct(roundPct((it.getVotes() * 100.0) / denom)));
        });

        return perDay.values().stream().flatMap(List::stream).toList();
    }



    // ------------------------------------------------------------------------
    // Helpers (same spirit as VoteTally)
    // ------------------------------------------------------------------------


    private int toInt(Object v) {
        if (v == null) return 0;
        if (v instanceof Number n) return n.intValue();
        try { return Integer.parseInt(v.toString()); }
        catch (Exception e) { return 0; }
    }


    private long sumVotesFromJson(JsonNode node) {
        if (node == null || node.isNull() || node.isMissingNode()) return 0L;

        // expected: {"uuid": 123, "uuid2": 456}
        if (!node.isObject()) {
            throw new ResponseStatusException(BAD_REQUEST, "candidateVotes must be a JSON object");
        }

        long sum = 0L;
        var it = node.fields();
        while (it.hasNext()) {
            var e = it.next();
            JsonNode v = e.getValue();
            if (v == null || v.isNull()) continue;

            if (v.isNumber()) {
                sum += v.longValue();
            } else if (v.isTextual()) {
                String s = v.asText().trim();
                if (!s.isEmpty() && s.matches("^\\d+$")) sum += Long.parseLong(s);
                else throw new ResponseStatusException(BAD_REQUEST, "candidateVotes contains non-numeric value for key=" + e.getKey());
            } else {
                throw new ResponseStatusException(BAD_REQUEST, "candidateVotes contains invalid value type for key=" + e.getKey());
            }
        }
        return sum;
    }

    private JsonNode writeVotes(Map<UUID, Integer> m) {
        try {
            ObjectNode obj = OM.createObjectNode();
            Map<UUID, Integer> safe = (m == null ? Collections.emptyMap() : m);

            for (Map.Entry<UUID, Integer> e : safe.entrySet()) {
                if (e.getKey() == null) continue;
                obj.put(e.getKey().toString(), e.getValue() == null ? 0 : e.getValue());
            }
            return obj;
        } catch (Exception e) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid candidateVotes", e);
        }
    }


    // --- helpers ---
    private void requireElection(UUID id) {
        if (id == null) throw new ResponseStatusException(BAD_REQUEST, "electionId is required");
    }
    private long toLong(Object x) {
        if (x == null) return 0L;
        if (x instanceof Number n) return n.longValue();
        return Long.parseLong(String.valueOf(x));
    }
    private double roundPct(double v) { return Math.round(v * 100.0) / 100.0; }
    private void applyVoteShare(Collection<List<CandidateScopedTotalDto>> groups) {
        for (var list : groups) {
            long total = list.stream().mapToLong(CandidateScopedTotalDto::getVotes).sum();
            double denom = total == 0 ? 1.0 : total;
            list.forEach(it -> it.setVoteSharePct(roundPct(it.getVotes() * 100.0 / denom)));
        }
    }


    // ----------------- LOCAL UTILS -----------------
    private int nz(Integer x) { return x == null ? 0 : x; }

    private int coalesce(Integer a, Integer b) { return a != null ? a : (b == null ? 0 : b); }

    // re-use the same JSON shape as mapper: { "candidateId": number, ... }
    private static final com.fasterxml.jackson.databind.ObjectMapper OM = new com.fasterxml.jackson.databind.ObjectMapper();


    private String buildNecResultPayloadHash(NECResult nr) {
        try {
            Map<String, Object> payload = new java.util.TreeMap<>();

            payload.put("resultId", String.valueOf(nr.getResultId()));
            payload.put("electionId", String.valueOf(nr.getElection().getElectionId()));
            payload.put("contestId", String.valueOf(nr.getContest().getContestId()));
            payload.put("centerId", String.valueOf(nr.getPollingCenter().getCenterId()));

            payload.put("totalRegisteredVoters", nz(nr.getTotalRegisteredVoters()));
            payload.put("ballotsCast", nz(nr.getBallotsInBox())); // ballots_cast in DB

            payload.put("invalidBallots", nz(nr.getInvalidBallots()));
            payload.put("unmarkedBallots", nz(nr.getUnmarkedBallots()));
            payload.put("rejectedBallots", nz(nr.getRejectedBallots()));
            payload.put("spoiledBallots", nz(nr.getSpoiledBallots()));
            payload.put("unusedBallots", nz(nr.getUnusedBallots()));

            // Deterministic candidateVotes ordering
            Map<String, Integer> votes = new java.util.TreeMap<>();
            com.fasterxml.jackson.databind.JsonNode node = nr.getCandidateVotes();
            if (node != null && node.isObject()) {
                node.fieldNames().forEachRemaining(k -> {
                    com.fasterxml.jackson.databind.JsonNode v = node.get(k);
                    if (v == null) return;

                    if (v.isNumber()) votes.put(k, v.asInt());
                    else if (v.isTextual() && v.asText().matches("^[0-9]+$")) {
                        votes.put(k, Integer.parseInt(v.asText()));
                    }
                });
            }
            payload.put("candidateVotes", votes);

            // Publish window matters (optional but consistent)
            payload.put("publishedAt", nr.getPublishedAt() == null ? null : nr.getPublishedAt().toString());
            payload.put("publishedUntil", nr.getPublishedUntil() == null ? null : nr.getPublishedUntil().toString());

            String json = objectMapper.writeValueAsString(payload);

            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(json.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return bytesToHex(digest);

        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to hash NECResult payload: " + e.getMessage()
            );
        }
    }




    private String sha256Hex(String input) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] out = md.digest(input.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder(out.length * 2);
        for (byte b : out) sb.append(String.format("%02x", b));
        return sb.toString();
    }


    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    private UUID toUuid(Object o) {
        if (o == null) return null;
        if (o instanceof UUID) return (UUID) o;
        if (o instanceof String) return UUID.fromString((String) o);
        return UUID.fromString(o.toString());
    }

    private static UUID id(Election e) { return e == null ? null : e.getElectionId(); }
    private static UUID id(Contest c) { return c == null ? null : c.getContestId(); }
    private static UUID id(PollingCenter pc) { return pc == null ? null : pc.getCenterId(); }




    /**
     * Core integrity checks for a polling center tally.
     *
     * @param sumVotes        Sum of all candidate votes (already computed)
     * @param invalid         Count of invalid ballots
     * @param unmarked           Count of unmarked ballots
     * @param rejected        Count of rejected ballots
     * @param spoiled         Count of spoiled ballots
     * @param ballotsInBox            Total ballots cast at the center
     * @param registered      Total registered voters (authoritative, from allocation)
     * @param ballotsIssued   (Optional) ballots issued to the center for the election; may be null
     *
     * @throws ResponseStatusException BAD_REQUEST when any consistency rule is violated
     */
    private void validateTallyInternal(long sumVotes,
                                       int invalid,
                                       int unmarked,
                                       int rejected,
                                       int spoiled,
                                       int unused,         // ✅ NEW
                                       int ballotsInBox,
                                       int registered,
                                       Integer ballotsIssued) {

        // ---- Basic domain sanity ----
        if (ballotsInBox < 0 || registered < 0) {
            throw new ResponseStatusException(BAD_REQUEST,
                    "Negative counts are not allowed: cast=" + ballotsInBox + ", registered=" + registered);
        }

        if (invalid < 0 || unmarked < 0 || rejected < 0 || spoiled < 0 || unused < 0) {
            throw new ResponseStatusException(BAD_REQUEST,
                    "Negative category count (invalid/unmarked/rejected/spoiled/unused) is not allowed: " +
                            "invalid=" + invalid + ", unmarked=" + unmarked + ", rejected=" + rejected +
                            ", spoiled=" + spoiled + ", unused=" + unused);
        }
        if (ballotsIssued != null && ballotsIssued < 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Negative ballotsIssued is not allowed: " + ballotsIssued);
        }
        if (sumVotes < 0) {
            throw new ResponseStatusException(BAD_REQUEST, "sumVotes cannot be negative: " + sumVotes);
        }

        // ---- Accounting check: buckets that are part of ballotsInBox must fit within 'cast' ----
        // ✅ NOTE: unused ballots are NOT part of cast, so exclude from accounted.
        long insideBox = sumVotes + (long) invalid + unmarked + rejected;
        if (insideBox != (long) ballotsInBox) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "ballotsInBox mismatch. Expected ballotsInBox = validVotes + invalid + unmarked + rejected. " +
                            "expected=" + insideBox +
                            " (validVotes=" + sumVotes +
                            ", invalid=" + invalid +
                            ", unmarked=" + unmarked +
                            ", rejected=" + rejected +
                            "), but ballotsInBox=" + ballotsInBox
            );
        }


        // ---- Logistics check: ballotsInBox + unused cannot exceed issued (when available) ----
        long totalHandled = (long) ballotsInBox + (long) unused + (long) spoiled;
        if (ballotsIssued != null && totalHandled > ballotsIssued) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "ballotsInBox + unusedBallots + spoiledBallots exceeds ballotsIssued. " +
                            "ballotsInBox=" + ballotsInBox +
                            ", unusedBallots=" + unused +
                            ", spoiledBallots=" + spoiled +
                            ", total=" + totalHandled +
                            ", ballotsIssued=" + ballotsIssued
            );
        }


        // ---- Registration check: turnout cannot exceed 100% ----
        if ((long) ballotsInBox > (long) registered) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "ballotsInBox exceeds totalRegisteredVoters. ballotsInBox=" + ballotsInBox + ", registered=" + registered
            );
        }

    }



    // ----------------- VALIDATION HELPERS -----------------
    /** Create: sum votes from request map; Update: provide sumVotesOverride */
    private void validateTally(Map<UUID,Integer> votesMap,
                               int invalid, int unmarked, int rejected, int spoiled,
                               int unused,            // ✅ NEW
                               int ballotsInBox, int registered, Integer ballotsIssued) {
        long sumVotes = (votesMap == null) ? 0L : votesMap.values().stream().mapToLong(Integer::longValue).sum();
        validateTallyInternal(sumVotes, invalid, unmarked, rejected, spoiled, unused, ballotsInBox, registered, ballotsIssued);
    }

    private void validateTally(Map<UUID,Integer> votesMap,
                               int invalid, int unmarked, int rejected, int spoiled,
                               int unused,            // ✅ NEW
                               int ballotsInBox, int registered, Integer ballotsIssued, long sumVotesOverride) {
        long sumVotes = (votesMap == null) ? sumVotesOverride
                : votesMap.values().stream().mapToLong(Integer::longValue).sum();
        validateTallyInternal(sumVotes, invalid, unmarked, rejected, spoiled, unused, ballotsInBox, registered, ballotsIssued);
    }




}
