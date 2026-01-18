package election.ems_backend.service.implement;

import election.ems_backend.dto.ImportBatchDto;
import election.ems_backend.entity.ImportBatch;
import election.ems_backend.entity.NecResultStaging;
import election.ems_backend.entity.PollingCenter;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.repository.ImportBatchRepository;
import election.ems_backend.repository.NecResultStagingRepository;
import election.ems_backend.repository.PollingCenterRepository;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.service.AuditLogService;
import election.ems_backend.service.BatchProcessingService;
import election.ems_backend.service.ImportBatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.NOT_FOUND;

/**
 * Implementation of ImportBatchService that integrates with nec_result_staging and the DB publish function.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ImportBatchServiceImplementation implements ImportBatchService {

    private final ImportBatchRepository batchRepo;
    private final NecResultStagingRepository stagingRepo;
    private final PollingCenterRepository centerRepo;
    private final SystemUserRepository userRepo;
    private final AuditLogService auditLogService;
    private final BatchProcessingService batchProcessingService;




    @Override
    public ImportBatchDto createBatch(ImportBatchDto dto) {
        ImportBatch b = new ImportBatch();
        b.setBatchId(dto.getBatchId() == null ? UUID.randomUUID() : dto.getBatchId());
        b.setName(dto.getName());
        b.setDescription(dto.getDescription());
        b.setCreatedBy(dto.getCreatedBy());
        b.setCreatedAt(dto.getCreatedAt() == null ? LocalDateTime.now() : dto.getCreatedAt());
        b.setRowCount(dto.getRowCount() == null ? 0 : dto.getRowCount());
        b.setValidated(dto.getValidated() == null ? false : dto.getValidated());
        b.setProcessed(dto.getProcessed() == null ? false : dto.getProcessed());
        ImportBatch saved = batchRepo.save(b);
        return toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ImportBatchDto getBatch(UUID batchId) {
        return batchRepo.findById(batchId).map(this::toDto)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Batch not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ImportBatchDto> listBatchesByCreator(UUID createdBy) {
        return batchRepo.findByCreatedBy(createdBy).stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public int validateBatch(UUID batchId, UUID validatorUserId) {
        List<NecResultStaging> rows = stagingRepo.findByBatchId(batchId);
        if (rows.isEmpty()) return 0;

        SystemUser validator = null;
        if (validatorUserId != null) {
            validator = userRepo.findById(validatorUserId)
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Validator user not found"));
        }

        int updated = 0;
        for (NecResultStaging s : rows) {
            List<String> errors = new ArrayList<>();

            // basic required checks
            if (s.getCandidateVotes() == null || s.getCandidateVotes().isEmpty()) {
                errors.add("candidate_votes is required and must contain at least one entry");
            }
            if (s.getBallotsCast() == null) {
                errors.add("ballots_cast is required");
            }
            if (s.getTotalRegisteredVoters() == null) {
                errors.add("total_registered_voters is required");
            }

            // resolve center code -> assigned_center_id if possible
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

            // candidate votes validation
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
            }
            s.setValidatedAt(LocalDateTime.now());
            stagingRepo.save(s);
            updated++;
        }

        // update batch validated flag if all rows validated
        boolean allValid = stagingRepo.findByBatchId(batchId).stream().allMatch(NecResultStaging::getValidated);
        batchRepo.findById(batchId).ifPresent(b -> { b.setValidated(allValid); batchRepo.save(b); });

        try {
            auditLogService.logUpdate(null, validatorUserId, "ImportBatch",
                    "Validated batch=" + batchId + " rows=" + updated);
        } catch (Exception ex) {
            // best-effort
        }

        return updated;
    }

    @Override
    public int processBatch(UUID batchId, UUID actorUserId) {
        // Ensure batch exists
        ImportBatch batch = batchRepo.findById(batchId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Batch not found"));

        // Count validated & unprocessed staging rows that will be processed by the async worker
        int toProcess = stagingRepo.findByBatchIdAndValidatedTrueAndProcessedFalse(batchId).size();

        // Ensure batch metadata is up-to-date
        int total = stagingRepo.findByBatchId(batchId).size();
        batch.setRowCount(total);
        batch.setProcessed(false); // mark as not yet fully processed
        batchRepo.save(batch);

        // Enqueue for asynchronous processing
        batchProcessingService.enqueueBatch(batchId, actorUserId);

        // Audit the enqueue action
        try {
            auditLogService.logCreate(null, actorUserId, "ImportBatch",
                    "Enqueued batch=" + batchId + " rows_to_process=" + toProcess);
        } catch (Exception ex) {
            // best-effort; do not fail the enqueue on audit errors
        }

        // Return number of rows that were queued (0 means nothing to do)
        return toProcess;
    }


    private ImportBatchDto toDto(ImportBatch b) {
        if (b == null) return null;
        ImportBatchDto d = new ImportBatchDto();
        d.setBatchId(b.getBatchId());
        d.setName(b.getName());
        d.setDescription(b.getDescription());
        d.setCreatedBy(b.getCreatedBy());
        d.setCreatedAt(b.getCreatedAt());
        d.setRowCount(b.getRowCount());
        d.setValidated(b.getValidated());
        d.setProcessed(b.getProcessed());
        return d;
    }
}