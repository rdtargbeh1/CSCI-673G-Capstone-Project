package election.ems_backend.service.implement;

import election.ems_backend.entity.NecResultStaging;
import election.ems_backend.repository.ImportBatchRepository;
import election.ems_backend.repository.NecResultStagingRepository;
import election.ems_backend.service.AuditLogService;
import election.ems_backend.service.PublishStagingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Asynchronous batch processor that promotes validated, unprocessed staging rows in chunks.
 * Each row is promoted using PublishStagingService.publishStagingRow(...) which runs in its own REQUIRES_NEW transaction.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AsyncBatchProcessor {

    private final NecResultStagingRepository stagingRepo;
    private final ImportBatchRepository batchRepo;
    private final PublishStagingService publishService;
    private final AuditLogService auditLogService;

    // chunk size - tune for performance
    private static final int CHUNK_SIZE = 100;

    @Async("batchTaskExecutor")
    public void processBatchAsync(UUID batchId, UUID actorUserId) {
        log.info("Async processing started for batch {}", batchId);
        int processedCount = 0;

        try {
            // iterate pages until no more rows
            int page = 0;
            while (true) {
                Page<NecResultStaging> chunk = stagingRepo.findByBatchIdAndValidatedTrueAndProcessedFalse(batchId, PageRequest.of(page, CHUNK_SIZE));
                List<NecResultStaging> rows = chunk.getContent();
                if (rows == null || rows.isEmpty()) break;

                for (NecResultStaging s : rows) {
                    try {
                        publishService.publishStagingRow(s.getStagingId(), actorUserId);
                        // mark processed in a separate transaction boundary
                        markStagingProcessed(s);
                        processedCount++;
                    } catch (Exception ex) {
                        log.error("Failed to publish staging {}: {}", s.getStagingId(), ex.getMessage(), ex);
                        // annotate the staging row with the error (best-effort)
                        try {
                            s.setValidationErrors((s.getValidationErrors() == null ? "" : s.getValidationErrors() + "; ")
                                    + "promotion error: " + ex.getMessage());
                            stagingRepo.save(s);
                        } catch (Exception e) {
                            log.error("Failed to save staging error for {}: {}", s.getStagingId(), e.getMessage(), e);
                        }
                    }
                }

                if (!chunk.hasNext()) break;
                page++;
            }

            // update import_batch counters
            updateBatchMetadata(batchId);

            try {
                auditLogService.logCreate(null, actorUserId, "ImportBatch",
                        "Async processed batch=" + batchId + " rows=" + processedCount);
            } catch (Exception ex) {
                log.warn("Audit logging failed for batch {}: {}", batchId, ex.getMessage());
            }

            // Refresh mv_nec_result_geo can be done here or scheduled elsewhere.
            // NOTE: refreshing materialized view concurrently may require privileges.
            try {
                // Optionally call refresh helper if you want immediate public visibility.
                // jdbc.execute("SELECT refresh_mv_nec_result_geo()");
            } catch (Exception ex) {
                log.warn("Materialized view refresh failed: {}", ex.getMessage());
            }

        } catch (Exception ex) {
            log.error("Async batch processing failed for batch {}: {}", batchId, ex.getMessage(), ex);
        } finally {
            log.info("Async processing finished for batch {} processedCount={}", batchId, processedCount);
        }
    }

    @Transactional
    protected void markStagingProcessed(NecResultStaging s) {
        s.setProcessed(true);
        s.setProcessedAt(LocalDateTime.now());
        stagingRepo.save(s);
    }

    @Transactional
    protected void updateBatchMetadata(UUID batchId) {
        batchRepo.findById(batchId).ifPresent(b -> {
            int total = stagingRepo.findByBatchId(batchId).size();
            int procCount = stagingRepo.findByBatchIdAndProcessedTrue(batchId).size();
            b.setRowCount(total);
            b.setProcessed(procCount == total && total > 0);
            batchRepo.save(b);
        });
    }
}