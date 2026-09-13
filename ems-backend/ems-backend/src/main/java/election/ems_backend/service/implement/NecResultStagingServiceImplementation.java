package election.ems_backend.service.implement;

import com.fasterxml.jackson.databind.ObjectMapper;
import election.ems_backend.dto.NecResultStagingDto;
import election.ems_backend.entity.NecResultStaging;
import election.ems_backend.entity.PollingCenter;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.mapper.NECResultMapper;
import election.ems_backend.repository.NecResultStagingRepository;
import election.ems_backend.repository.PollingCenterRepository;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.service.AuditLogService;
import election.ems_backend.service.NecResultStagingService;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
@Transactional
public class NecResultStagingServiceImplementation implements NecResultStagingService {


    private final NecResultStagingRepository stagingRepo;
    private final PollingCenterRepository centerRepo;
    private final SystemUserRepository userRepo;
    private final AuditLogService auditLogService;
    private final NECResultMapper mapper = new NECResultMapper();
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper = new ObjectMapper();


    @Override
    public NecResultStagingDto submitStaging(NecResultStagingDto dto) {
        NecResultStaging s = new NecResultStaging();
        s.setStagingId(UUID.randomUUID());
        s.setBatchId(dto.getBatchId());
        s.setElectionId(dto.getElectionId());
        s.setCenterCode(dto.getCenterCode());
        s.setCandidateVotes(dto.getCandidateVotes());
        s.setTotalRegisteredVoters(dto.getTotalRegisteredVoters());
        s.setBallotsCast(dto.getBallotsCast());
        s.setInvalidBallots(dto.getInvalidBallots());
        s.setUnmarkedBallots(dto.getUnmarkedBallots());
        s.setUnusedBallots(dto.getUnusedBallots());
        s.setRejectedBallots(dto.getRejectedBallots());
        s.setSpoiledBallots(dto.getSpoiledBallots());
        s.setSource(dto.getSource());
        if (dto.getUploadedBy() != null) {
            userRepo.findById(dto.getUploadedBy()).ifPresent(s::setUploadedBy);
        }
        s.setUploadTime(LocalDateTime.now());
        s.setValidated(false);
        s.setValidationErrors(null);
        s.setIsPublished(false);
        s.setProcessed(false);

        // If centerCode resolves now, set assignedCenterId for convenience
        if (s.getCenterCode() != null) {
            centerRepo.findByCodeIgnoreCase(s.getCenterCode()).ifPresent(pc -> s.setAssignedCenterId(pc.getCenterId()));
        }

        NecResultStaging saved = stagingRepo.save(s);
        return mapper.toDto(saved);
    }


    @Override
    @Transactional(readOnly = true)
    public List<NecResultStagingDto> listStagingByElection(UUID electionId) {
        return stagingRepo.findByElectionId(electionId).stream().map(mapper::toDto).collect(Collectors.toList());
    }


    @Override
    public int validateStagingByElection(UUID electionId, UUID validatorUserId) {
        List<NecResultStaging> rows = stagingRepo.findByElectionIdAndValidatedFalse(electionId);
        if (rows.isEmpty()) return 0;

        SystemUser validator = null;
        if (validatorUserId != null) {
            validator = userRepo.findById(validatorUserId)
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Validator user not found"));
        }

        int updated = 0;
        for (NecResultStaging s : rows) {
            List<String> errors = new ArrayList<>();

            // required fields
            if (s.getCandidateVotes() == null || s.getCandidateVotes().isEmpty()) {
                errors.add("candidate_votes is required and must contain at least one entry");
            }
            if (s.getBallotsCast() == null) {
                errors.add("ballots_cast is required");
            }
            if (s.getTotalRegisteredVoters() == null) {
                errors.add("total_registered_voters is required");
            }

            // resolve center code -> assigned_center_id
            if (s.getCenterCode() != null && !s.getCenterCode().isBlank()) {
                Optional<PollingCenter> pcOpt = centerRepo.findByCodeIgnoreCase(s.getCenterCode());
                if (pcOpt.isPresent()) {
                    s.setAssignedCenterId(pcOpt.get().getCenterId());
                } else {
                    errors.add("center_code not found: " + s.getCenterCode());
                }
            } else {
                errors.add("center_code is required");
            }

            // logical checks: ballots_cast should be >= sum of candidate votes and match relations with invalid/blank/spoiled etc.
            int sumCandidateVotes = 0;
            if (s.getCandidateVotes() != null) {
                for (Integer v : s.getCandidateVotes().values()) {
                    if (v == null || v < 0) {
                        errors.add("candidate_votes contains null/negative value");
                        break;
                    }
                    sumCandidateVotes += v;
                }
            }

            int otherInvalid = (s.getInvalidBallots() == null ? 0 : s.getInvalidBallots())
                    + (s.getUnmarkedBallots() == null ? 0 : s.getUnmarkedBallots())
                    + (s.getUnusedBallots() == null ? 0 : s.getUnusedBallots())
                    + (s.getRejectedBallots() == null ? 0 : s.getRejectedBallots())
                    + (s.getSpoiledBallots() == null ? 0 : s.getSpoiledBallots());

            if (s.getBallotsCast() != null && s.getBallotsCast() < sumCandidateVotes + otherInvalid) {
                errors.add("ballots_cast is less than sum(candidate_votes) + invalid/blank/rejected/spoiled");
            }

            if (s.getTotalRegisteredVoters() != null && s.getBallotsCast() != null &&
                    s.getTotalRegisteredVoters() < s.getBallotsCast()) {
                errors.add("total_registered_voters is less than ballots_cast");
            }

            if (errors.isEmpty()) {
                s.setValidated(true);
                s.setValidationErrors(null);
            } else {
                s.setValidated(false);
                s.setValidationErrors(String.join("; ", errors));
            }

            if (validator != null) {
                s.setValidatedBy(validator);
                s.setValidatedAt(LocalDateTime.now());
            } else {
                s.setValidatedAt(LocalDateTime.now());
            }

            stagingRepo.save(s);
            updated++;
        }

        try {
            auditLogService.logUpdate(null, validatorUserId, "NecResultStaging",
                    "Validated staging rows for election=" + electionId + " rows=" + updated);
        } catch (Exception ex) {
            // best-effort
        }

        return updated;
    }


    @Override
    public int promoteValidatedStaging(UUID electionId, UUID actorUserId) {
        List<NecResultStaging> rows = stagingRepo.findByElectionIdAndValidatedTrueAndIsPublishedFalse(electionId);
        if (rows.isEmpty()) return 0;

        SystemUser actor = null;
        if (actorUserId != null) {
            actor = userRepo.findById(actorUserId)
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Actor user not found"));
        }

        int promoted = 0;
        LocalDateTime now = LocalDateTime.now();

        String upsertSql =
                "INSERT INTO nec_result (result_id, election_id, center_id, candidate_votes, total_registered_voters, ballots_cast, invalid_ballots, blank_ballots, rejected_ballots, spoiled_ballots, source, upload_time, is_published) " +
                        "VALUES (gen_random_uuid(), ?, ?, ?::jsonb, ?, ?, ?, ?, ?, ?, ?, ?, false) " +
                        "ON CONFLICT (election_id, center_id) DO UPDATE SET " +
                        "candidate_votes = EXCLUDED.candidate_votes, " +
                        "total_registered_voters = EXCLUDED.total_registered_voters, " +
                        "ballots_cast = EXCLUDED.ballots_cast, " +
                        "invalid_ballots = EXCLUDED.invalid_ballots, " +
                        "blank_ballots = EXCLUDED.blank_ballots, " +
                        "rejected_ballots = EXCLUDED.rejected_ballots, " +
                        "spoiled_ballots = EXCLUDED.spoiled_ballots, " +
                        "source = EXCLUDED.source, " +
                        "upload_time = EXCLUDED.upload_time " +
                        "RETURNING result_id";

        String insertHistorySql =
                "INSERT INTO nec_result_history (history_id, result_id, election_id, center_id, candidate_votes, total_registered_voters, ballots_cast, invalid_ballots, blank_ballots, rejected_ballots, spoiled_ballots, change_type, changed_by, changed_at, notes) " +
                        "VALUES (gen_random_uuid(), ?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        for (NecResultStaging s : rows) {
            try {
                // ensure assigned center id is set
                if (s.getAssignedCenterId() == null && s.getCenterCode() != null) {
                    Optional<PollingCenter> pcOpt = centerRepo.findByCodeIgnoreCase(s.getCenterCode());
                    if (pcOpt.isPresent()) {
                        s.setAssignedCenterId(pcOpt.get().getCenterId());
                    } else {
                        s.setValidationErrors((s.getValidationErrors() == null ? "" : s.getValidationErrors() + "; ")
                                + "assigned center could not be resolved at promotion");
                        stagingRepo.save(s);
                        continue;
                    }
                }

                if (s.getAssignedCenterId() == null) {
                    s.setValidationErrors((s.getValidationErrors() == null ? "" : s.getValidationErrors() + "; ")
                            + "assigned center missing");
                    stagingRepo.save(s);
                    continue;
                }

                // convert candidateVotes map to JSON string
                String candidateVotesJson = objectMapper.writeValueAsString(s.getCandidateVotes() == null ? Collections.emptyMap() : s.getCandidateVotes());

                // perform upsert and get result_id
                UUID resultId = jdbc.queryForObject(upsertSql,
                        new Object[]{
                                s.getElectionId(),
                                s.getAssignedCenterId(),
                                candidateVotesJson,
                                s.getTotalRegisteredVoters(),
                                s.getBallotsCast(),
                                s.getInvalidBallots(),
                                s.getUnmarkedBallots(),
                                s.getUnusedBallots(),
                                s.getRejectedBallots(),
                                s.getSpoiledBallots(),
                                s.getSource(),
                                s.getUploadTime() != null ? s.getUploadTime() : now
                        },
                        UUID.class);

                // determine change_type: if processed_result_id already exists and equals resultId -> UPDATED else PROMOTED/CREATED
                String changeType = (s.getProcessedResultId() != null && s.getProcessedResultId().equals(resultId)) ? "UPDATED" : "PROMOTED";

                // insert history record
                jdbc.update(insertHistorySql,
                        resultId,
                        s.getElectionId(),
                        s.getAssignedCenterId(),
                        candidateVotesJson,
                        s.getTotalRegisteredVoters(),
                        s.getBallotsCast(),
                        s.getInvalidBallots(),
                        s.getUnmarkedBallots(),
                        s.getUnusedBallots(),
                        s.getRejectedBallots(),
                        s.getSpoiledBallots(),
                        changeType,
                        actorUserId,
                        now,
                        "Promoted from staging id=" + s.getStagingId()
                );

                // update staging row link and processed flags
                s.setProcessed(true);
                s.setProcessedAt(now);
                s.setProcessedResultId(resultId);
                s.setValidationErrors(null);
                if (actor != null) s.setPublishedBy(actor); // record actor as publisher of this promotion step if desired
                stagingRepo.save(s);

                promoted++;

            } catch (Exception ex) {
                // mark error on staging row
                s.setProcessed(false);
                String prev = s.getValidationErrors() == null ? "" : s.getValidationErrors() + "; ";
                s.setValidationErrors(prev + "promotion error: " + ex.getMessage());
                stagingRepo.save(s);
            }
        }

        try {
            auditLogService.logCreate(null, actorUserId, "NecResult",
                    "Promoted staging for election=" + electionId + " rows_promoted=" + promoted);
        } catch (Exception ex) {
            // best-effort
        }

        return promoted;
    }
}
