package election.ems_backend.service;

import election.ems_backend.dto.AuditLedgerDto;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service to append and query the audit ledger and verify chain integrity.
 */
public interface AuditLedgerService {
    /**
     * Append an entry to the audit ledger. Calculates payload_hash and chain_hash.
     *
     * @param entryType human-friendly type (e.g., "vote_submission", "submission_contest_vote")
     * @param entryReference optional reference UUID (entity id)
     * @param payload canonical string payload to hash (JSON string recommended)
     * @param actorId optional actor who caused the change
     * @param signature optional signature (application-level)
     * @return DTO of saved ledger row
     */
    AuditLedgerDto appendEntry(String entryType, UUID entryReference, String payload, UUID actorId, String signature);

    Optional<AuditLedgerDto> getLatest();

    List<AuditLedgerDto> listByEntryReference(UUID entryReference);

    List<AuditLedgerDto> listByEntryType(String entryType);

    List<AuditLedgerDto> listAll();

    /**
     * Verify the ledger chain integrity.
     * Returns a list of human-readable errors found (empty = OK).
     */
    List<String> verifyLedgerChain();
}
