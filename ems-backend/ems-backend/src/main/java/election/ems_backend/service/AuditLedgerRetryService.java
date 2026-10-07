package election.ems_backend.service;

import election.ems_backend.dto.AuditLedgerRetryDto;

import java.util.List;
import java.util.UUID;

public interface AuditLedgerRetryService {
    /**
     * Enqueue a failed audit ledger append for retry.
     */
    void enqueueRetry(String entryType, UUID entryReference, String payload, UUID actorId, String signature, String error);

    /**
     * Attempt to process pending retries (batch). Returns number processed successfully.
     */
    int processPendingRetries();

    /**
     * Force reprocess a single retry item by id.
     */
    void processSingle(UUID retryId);

    /**
     * List retry items (paged minimal support).
     */
    List<AuditLedgerRetryDto> listPending(int limit);
}