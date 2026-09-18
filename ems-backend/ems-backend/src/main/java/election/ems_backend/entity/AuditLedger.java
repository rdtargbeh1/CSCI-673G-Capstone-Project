package election.ems_backend.entity;


import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Maps to audit_ledger table.
 */
@Entity
@Table(name = "audit_ledger")
@Getter
@Setter
@NoArgsConstructor
public class AuditLedger {

    @Id
    @Column(name = "ledger_id", nullable = false)
    private UUID ledgerId;

    @Column(name = "entry_type")
    private String entryType;

    @Column(name = "entry_reference")
    private UUID entryReference;

    @Column(name = "payload_hash", nullable = false, columnDefinition = "text")
    private String payloadHash;

    @Column(name = "prev_hash", columnDefinition = "text")
    private String prevHash;

    @Column(name = "chain_hash", nullable = false, columnDefinition = "text")
    private String chainHash;

    @Column(name = "actor_id")
    private UUID actorId;

    @Column(name = "signature")
    private String signature;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (ledgerId == null) ledgerId = UUID.randomUUID();
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}