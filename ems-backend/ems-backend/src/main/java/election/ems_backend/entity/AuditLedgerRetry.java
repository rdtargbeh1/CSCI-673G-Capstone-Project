package election.ems_backend.entity;


import election.ems_backend.enums.AuditLedgerStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * AuditLedgerRetry JPA entity matching the audit_ledger_retry table.
 * Includes status/claiming columns (status, claimed_by, claimed_at) used by worker claiming logic.
 */
@Entity
@Table(name = "audit_ledger_retry",
        indexes = {
                @Index(name = "idx_audit_ledger_retry_next_attempt", columnList = "next_attempt_at"),
                @Index(name = "idx_audit_ledger_retry_entry_ref", columnList = "entry_reference"),
                @Index(name = "idx_audit_ledger_retry_status_next", columnList = "status, next_attempt_at"),
                @Index(name = "idx_audit_ledger_retry_claimed_at", columnList = "claimed_at")
        })
@Getter
@Setter
@NoArgsConstructor
@ToString
public class AuditLedgerRetry {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "retry_id", nullable = false, updatable = false)
    private UUID retryId;

    @Column(name = "entry_type", length = 60)
    private String entryType;

    @Column(name = "entry_reference")
    private UUID entryReference;

    @Column(name = "payload", columnDefinition = "text", nullable = false)
    private String payload;

    @Column(name = "actor_id")
    private UUID actorId;

    @Column(name = "signature")
    private String signature;

    @Column(name = "last_error", columnDefinition = "text")
    private String lastError;

    @Column(name = "attempts", nullable = false)
    private Integer attempts = 0;

    @Column(name = "next_attempt_at")
    private LocalDateTime nextAttemptAt;

    // Claiming / status fields added to support SELECT ... FOR UPDATE SKIP LOCKED or claim workflows
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private AuditLedgerStatus status = AuditLedgerStatus.PENDING;

    @Column(name = "claimed_by")
    private UUID claimedBy;

    @Column(name = "claimed_at")
    private LocalDateTime claimedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (nextAttemptAt == null) {
            // default initial retry after 30 seconds
            nextAttemptAt = createdAt.plusSeconds(30);
        }
        if (attempts == null) attempts = 0;
        if (status == null) status = AuditLedgerStatus.PENDING;
    }
}