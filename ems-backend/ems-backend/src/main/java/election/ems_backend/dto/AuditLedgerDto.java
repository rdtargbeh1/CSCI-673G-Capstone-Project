package election.ems_backend.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for AuditLedger
 */
@Data
public class AuditLedgerDto {
    private UUID ledgerId;
    private String entryType;
    private UUID entryReference;
    private String payloadHash;
    private String prevHash;
    private String chainHash;
    private UUID actorId;
    private String signature;
    private LocalDateTime createdAt;
}