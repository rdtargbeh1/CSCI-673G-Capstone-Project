package election.ems_backend.service.implement;

import election.ems_backend.service.BatchProcessingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Lightweight implementation that delegates to AsyncBatchProcessor.
 */
@Service
@RequiredArgsConstructor
public class BatchProcessingServiceImpl implements BatchProcessingService {

    private final AsyncBatchProcessor asyncBatchProcessor;

    @Override
    public void enqueueBatch(java.util.UUID batchId, java.util.UUID actorUserId) {
        asyncBatchProcessor.processBatchAsync(batchId, actorUserId);
    }
}