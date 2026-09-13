package election.ems_backend.service;

import election.ems_backend.dto.ImportBatchDto;

import java.util.List;
import java.util.UUID;

public interface ImportBatchService {
    ImportBatchDto createBatch(ImportBatchDto dto);
    ImportBatchDto getBatch(UUID batchId);
    List<ImportBatchDto> listBatchesByCreator(UUID createdBy);
    /**
     * Validate staging rows attached to the batch.
     * Returns number of rows validated (updated).
     */
    int validateBatch(UUID batchId, UUID validatorUserId);

    /**
     * Process (promote) validated staging rows for the batch by calling publish_nec_result per row.
     * Returns number of rows processed (promoted).
     */
    int processBatch(UUID batchId, UUID actorUserId);
}