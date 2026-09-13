
package election.ems_backend.service.implement;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import election.ems_backend.dto.VoteSubmissionRankingDto;
import election.ems_backend.entity.Contest;
import election.ems_backend.entity.ContestOption;
import election.ems_backend.entity.VoteSubmission;
import election.ems_backend.entity.VoteSubmissionContest;
import election.ems_backend.entity.VoteSubmissionRanking;
import election.ems_backend.enums.ContestVoteMethod;
import election.ems_backend.enums.VoteStatus;
import election.ems_backend.mapper.VoteSubmissionRankingMapper;
import election.ems_backend.repository.ContestOptionRepository;
import election.ems_backend.repository.ContestRepository;
import election.ems_backend.repository.VoteSubmissionContestRepository;
import election.ems_backend.repository.VoteSubmissionRankingRepository;
import election.ems_backend.repository.VoteSubmissionRepository;
import election.ems_backend.service.AuditLogService;
import election.ems_backend.service.VoteSubmissionRankingService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.*;

/**
 * Service that handles persistence and validation for submission_vote_ranking.
 *
 * Validations and rules implemented:
 * - ranking must be a JSON array (each element a UUID string).
 * - Each UUID in ranking must correspond to an option_id in contest_option for the contest (active options only).
 * - No duplicates.
 * - ranking length must respect contest.maxSelections
 * - Upsert by (submissionId, contestId)
 *
 * IMPORTANT INTEGRATION:
 * - After ranking is saved, we ALSO write rank values into vote_submission_contest for that submission+contest.
 *   This is what makes vote_submission_contest.rank non-null for ranked contests.
 *
 * Backfill:
 * - Rebuild rankings from vote_submission_contest rows where rank is NOT NULL (production-safe).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class VoteSubmissionRankingServiceImplementation implements VoteSubmissionRankingService {

    private static final Logger log = LoggerFactory.getLogger(VoteSubmissionRankingServiceImplementation.class);

    private final VoteSubmissionRankingRepository svrRepo;
    private final VoteSubmissionContestRepository voteSubmissionContestRepository;
    private final ContestOptionRepository optionRepo;
    private final VoteSubmissionRepository voteSubmissionRepository;
    private final ContestRepository contestRepository;
    private final AuditLogService auditLogService;
    private final VoteSubmissionRankingMapper mapper;

    private final ObjectMapper objectMapper;

    @Override
    public VoteSubmissionRankingDto createOrUpdateRanking(VoteSubmissionRankingDto dto) {
        if (dto == null) throw new ResponseStatusException(BAD_REQUEST, "Missing ranking DTO");
        if (dto.getSubmissionId() == null) throw new ResponseStatusException(BAD_REQUEST, "submissionId required");
        if (dto.getContestId() == null) throw new ResponseStatusException(BAD_REQUEST, "contestId required");
        if (dto.getRanking() == null) throw new ResponseStatusException(BAD_REQUEST, "ranking JSON array required");
        if (!dto.getRanking().isArray()) throw new ResponseStatusException(BAD_REQUEST, "ranking must be a JSON array");

        // Ensure submission exists
        VoteSubmission vs = voteSubmissionRepository.findById(dto.getSubmissionId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Submission not found"));

        // Ensure contest exists + vote method is RANKED
        Contest contest = contestRepository.findById(dto.getContestId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Contest not found"));

        if (contest.getVoteMethod() != ContestVoteMethod.RANKED) {
            throw new ResponseStatusException(BAD_REQUEST, "Ranking is only allowed for RANKED contests.");
        }

        // (Optional but safe) Ensure contest belongs to submission election if submission carries election
        if (vs.getElection() != null && vs.getElection().getElectionId() != null
                && contest.getElectionId() != null
                && !Objects.equals(vs.getElection().getElectionId(), contest.getElectionId())) {
            throw new ResponseStatusException(BAD_REQUEST, "contestId does not belong to submission election.");
        }

        ArrayNode arr = (ArrayNode) dto.getRanking();
        if (arr.size() == 0) throw new ResponseStatusException(BAD_REQUEST, "ranking array must not be empty");

        // Allowed options for contest (ACTIVE only)
        List<ContestOption> options = optionRepo.findByContestIdOrderByOptionOrderAsc(dto.getContestId());
        Set<UUID> allowed = options.stream()
                .filter(ContestOption::isActive)
                .map(ContestOption::getOptionId)
                .collect(Collectors.toSet());

        if (allowed.isEmpty()) {
            throw new ResponseStatusException(CONFLICT, "Contest has no active options; cannot accept ranking.");
        }

        // Parse + validate ranking UUIDs
        List<UUID> parsed = new ArrayList<>();
        for (JsonNode n : arr) {
            if (n == null || n.isNull()) {
                throw new ResponseStatusException(BAD_REQUEST, "ranking contains null value");
            }

            String s = n.isTextual() ? n.asText() : n.toString().replace("\"", "").trim();
            UUID optId;
            try {
                optId = UUID.fromString(s);
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(BAD_REQUEST, "invalid UUID in ranking: " + s);
            }

            if (!allowed.contains(optId)) {
                throw new ResponseStatusException(BAD_REQUEST,
                        "ranking contains option that does not belong to contest (or inactive): " + optId);
            }
            parsed.add(optId);
        }

        // No duplicates
        Set<UUID> uniq = new HashSet<>(parsed);
        if (uniq.size() != parsed.size()) {
            throw new ResponseStatusException(BAD_REQUEST, "ranking contains duplicate optionIds");
        }

        // Respect maxSelections
        int maxSelections = contest.getMaxSelections() <= 0 ? 1 : contest.getMaxSelections();
        if (parsed.size() > maxSelections) {
            throw new ResponseStatusException(BAD_REQUEST,
                    "ranking size exceeds maxSelections (" + maxSelections + ") for this contest.");
        }

        // Upsert by (submissionId, contestId)
        Optional<VoteSubmissionRanking> existingOpt =
                svrRepo.findBySubmissionIdAndContestId(dto.getSubmissionId(), dto.getContestId());

        VoteSubmissionRanking entity;
        boolean created;
        if (existingOpt.isPresent()) {
            entity = existingOpt.get();
            created = false;
        } else {
            entity = new VoteSubmissionRanking();
            created = true;
        }

        entity.setSubmissionId(dto.getSubmissionId());
        entity.setContestId(dto.getContestId());
        entity.setRanking(dto.getRanking());

        VoteSubmissionRanking saved = svrRepo.save(entity);

        // ✅ CRITICAL INTEGRATION:
        // write ranks into vote_submission_contest so rank column becomes populated
        syncRankingToSubmissionContest(vs, contest, parsed);

        // Audit (best-effort)
        try {
            if (created) {
                auditLogService.logCreate(null, null, "vote_submission_ranking",
                        "Created ranking svr=" + saved.getSvrId() +
                                " submission=" + saved.getSubmissionId() +
                                " contest=" + saved.getContestId());
            } else {
                auditLogService.logUpdate(null, null, "vote_submission_ranking",
                        "Updated ranking svr=" + saved.getSvrId() +
                                " submission=" + saved.getSubmissionId() +
                                " contest=" + saved.getContestId());
            }
        } catch (Exception ex) {
            log.debug("Audit log failed for vote_submission_ranking: {}", ex.getMessage());
        }

        return mapper.toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public VoteSubmissionRankingDto getById(UUID svrId) {
        return svrRepo.findById(svrId)
                .map(mapper::toDto)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Ranking not found: " + svrId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<VoteSubmissionRankingDto> getBySubmission(UUID submissionId) {
        return svrRepo.findBySubmissionId(submissionId)
                .stream().map(mapper::toDto).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<VoteSubmissionRankingDto> getByContest(UUID contestId) {
        return svrRepo.findByContestId(contestId)
                .stream().map(mapper::toDto).collect(Collectors.toList());
    }

    @Override
    public void deleteById(UUID svrId) {
        if (!svrRepo.existsById(svrId)) {
            throw new ResponseStatusException(NOT_FOUND, "Ranking not found: " + svrId);
        }

        VoteSubmissionRanking existing = svrRepo.findById(svrId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Ranking not found: " + svrId));

        // Delete the ranking row
        svrRepo.deleteById(svrId);

        // Best-effort: also clear ranks from vote_submission_contest for consistency
        try {
            UUID submissionId = existing.getSubmissionId();
            UUID contestId = existing.getContestId();
            if (submissionId != null && contestId != null) {
                voteSubmissionContestRepository.deleteBySubmissionAndContest(submissionId, contestId);
            }
        } catch (Exception ex) {
            log.debug("Could not clear vote_submission_contest after ranking delete: {}", ex.getMessage());
        }

        try {
            auditLogService.logDelete(null, null, "vote_submission_ranking", "Deleted ranking " + svrId);
        } catch (Exception ex) {
            log.debug("Audit log failed for delete vote_submission_ranking: {}", ex.getMessage());
        }
    }

    /**
     * Backfill strategy (production-safe):
     * Rebuild vote_submission_ranking from vote_submission_contest rows that already have rank.
     *
     * NOTE:
     * - Works even if VoteSubmission does NOT store ranking JSON.
     * - Requires VoteSubmission.contestId to be present (your project already uses it).
     */
    @Override
    public int backfillFromVerifiedSubmissionsForElection(UUID electionId) {

        List<VoteSubmission> subs = voteSubmissionRepository
                .findByElection_ElectionIdAndStatusAndDateDeletedIsNull(electionId, VoteStatus.VERIFIED);

        int processed = 0;

        for (VoteSubmission vs : subs) {
            try {
                UUID contestId = vs.getContestId();
                if (contestId == null) continue;

                List<VoteSubmissionContest> rankedRows =
                        voteSubmissionContestRepository.findBySubmissionIdAndContestIdAndRankIsNotNullOrderByRankAsc(
                                vs.getSubmissionId(), contestId
                        );

                if (rankedRows.isEmpty()) continue;

                ArrayNode arr = objectMapper.createArrayNode();
                for (VoteSubmissionContest row : rankedRows) {
                    arr.add(row.getOptionId().toString());
                }

                VoteSubmissionRankingDto dto = new VoteSubmissionRankingDto();
                dto.setSubmissionId(vs.getSubmissionId());
                dto.setContestId(contestId);
                dto.setRanking(arr);

                createOrUpdateRanking(dto);
                processed++;

            } catch (ResponseStatusException ex) {
                log.debug("Skipping submission {} during ranking backfill: {}", vs.getSubmissionId(), ex.getReason());
            } catch (Exception ex) {
                log.warn("Unexpected error backfilling submission {}: {}", vs.getSubmissionId(), ex.getMessage());
            }
        }

        try {
            auditLogService.logUpdate(null, null, "vote_submission_ranking",
                    "Backfilled rankings for election=" + electionId + " processed=" + processed);
        } catch (Exception ex) {
            log.debug("Audit log failed for ranking backfill: {}", ex.getMessage());
        }

        return processed;
    }

    /**
     * Writes rank values into vote_submission_contest for ranked contests.
     *
     * Strategy (simple + consistent):
     * - delete existing submission+contest rows
     * - insert one row per ranked option with vote_value=1 and rank=1..N
     */
    private void syncRankingToSubmissionContest(VoteSubmission vs, Contest contest, List<UUID> rankedOptionIds) {

        if (vs == null || vs.getSubmissionId() == null) return;
        if (contest == null || contest.getContestId() == null) return;
        if (rankedOptionIds == null || rankedOptionIds.isEmpty()) return;

        UUID submissionId = vs.getSubmissionId();
        UUID contestId = contest.getContestId();

        UUID orgId = (vs.getOrganization() != null ? vs.getOrganization().getOrgId() : null);
        UUID electionId = (vs.getElection() != null ? vs.getElection().getElectionId() : null);

        if (orgId == null) throw new ResponseStatusException(BAD_REQUEST, "Submission missing orgId");
        if (electionId == null) throw new ResponseStatusException(BAD_REQUEST, "Submission missing electionId");

        // Replace
        voteSubmissionContestRepository.deleteBySubmissionAndContest(submissionId, contestId);

        List<VoteSubmissionContest> rows = new ArrayList<>();
        int rank = 1;

        for (UUID optionId : rankedOptionIds) {
            VoteSubmissionContest r = new VoteSubmissionContest();
            r.setSubmissionId(submissionId);
            r.setOrgId(orgId);
            r.setElectionId(electionId);
            r.setContestId(contestId);
            r.setOptionId(optionId);

            // recommended for ranked selections:
            r.setVoteValue(1);
            r.setRank(rank++);

            rows.add(r);
        }

        voteSubmissionContestRepository.saveAll(rows);
    }
}
