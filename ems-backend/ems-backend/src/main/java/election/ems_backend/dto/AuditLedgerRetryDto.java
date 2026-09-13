package election.ems_backend.dto;

import election.ems_backend.enums.AuditLedgerStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for AuditLedgerRetry for admin views.
 */
@Data
public class AuditLedgerRetryDto {
    private UUID retryId;
    private String entryType;
    private UUID entryReference;
    private String payload;
    private UUID actorId;
    private String signature;
    private String lastError;
    private Integer attempts;
    private UUID claimedBy;
    private LocalDateTime claimedAt;
    private AuditLedgerStatus status;
    private LocalDateTime nextAttemptAt;
    private LocalDateTime createdAt;
}