package election.ems_backend.service.implement;


import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import election.ems_backend.dto.VoteSubmissionRankingDto;
import election.ems_backend.entity.*;
import election.ems_backend.enums.ContestVoteMethod;
import election.ems_backend.enums.VoteStatus;
import election.ems_backend.mapper.VoteSubmissionRankingMapper;
import election.ems_backend.repository.*;
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
 * - Each UUID in ranking must correspond to an option_id in contest_option for the contest.
 * - Idempotent create/update: if a ranking exists for submission+contest (via explicit lookup),
 *   this method creates a new row or updates existing by svrId if provided.
 *
 * Assumptions:
 * - VoteSubmission entity exists and (optionally) may contain ranking JSON if you wish to backfill.
 * - If VoteSubmission doesn't store ranking JSON, backfill will skip that submission.
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

        ArrayNode arr = (ArrayNode) dto.getRanking();
        if (arr.size() == 0) throw new ResponseStatusException(BAD_REQUEST, "ranking array must not be empty");

        // Allowed options for contest
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

        // Respect maxSelections (recommended)
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
            // svrId generated by @UuidGenerator, so no manual UUID needed
            created = true;
        }

        entity.setSubmissionId(dto.getSubmissionId());
        entity.setContestId(dto.getContestId());
        entity.setRanking(dto.getRanking());

        VoteSubmissionRanking saved = svrRepo.save(entity);

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
        svrRepo.deleteById(svrId);

        try {
            auditLogService.logDelete(null, null, "vote_submission_ranking", "Deleted ranking " + svrId);
        } catch (Exception ex) {
            log.debug("Audit log failed for delete vote_submission_ranking: {}", ex.getMessage());
        }
    }

    /**
     * Backfill strategy (production-safe):
     * Only backfills if VoteSubmission explicitly stores ranking JSON AND contestId (no reflection guessing).
     *
     * If you don’t store ranking in VoteSubmission, keep this method but return 0.
     */
    @Override
    public int backfillFromVerifiedSubmissionsForElection(UUID electionId) {

        List<VoteSubmission> subs = voteSubmissionRepository
                .findByElection_ElectionIdAndStatusAndDateDeletedIsNull(electionId, VoteStatus.VERIFIED);

        int processed = 0;

        for (VoteSubmission vs : subs) {
            try {
                // ✅ For "one submission per contest", contestId should be on VoteSubmission
                UUID contestId = vs.getContestId(); // <-- add this field if not added yet
                if (contestId == null) continue;

                // Build ranking from normalized rows (ranked options)
                List<VoteSubmissionContest> rankedRows =
                        voteSubmissionContestRepository.findBySubmissionIdAndContestIdAndRankIsNotNullOrderByRankAsc(
                                vs.getSubmissionId(), contestId
                        );

                if (rankedRows.isEmpty()) {
                    continue; // nothing to backfill
                }

                // ranking JSON = [optionId1, optionId2, ...] ordered by rank
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


}
