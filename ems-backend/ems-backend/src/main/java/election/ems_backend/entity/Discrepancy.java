package election.ems_backend.entity;

import election.ems_backend.enums.*;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "discrepancy", indexes = {
        @Index(name = "idx_disc_org_election_center", columnList = "org_id,election_id,center_id"),
        @Index(name = "idx_disc_submission", columnList = "submission_id"),
        @Index(name = "idx_disc_status", columnList = "status"),
        @Index(name = "idx_disc_type", columnList = "discrepancy_type"),
        @Index(name = "idx_disc_phase", columnList = "reconciliation_phase"),
        @Index(name = "idx_disc_severity", columnList = "severity"),
        @Index(name = "idx_disc_created_at", columnList = "created_at DESC")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Discrepancy {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "disc_id", nullable = false, updatable = false)
    private UUID discId;

    // ===== RELATIONSHIPS TO SOURCE DATA =====
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_discrepancy_submission"))
    private VoteSubmission voteSubmission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "election_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_discrepancy_election"))
    private Election election;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_discrepancy_place"))
    private PollingPlace pollingPlace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "center_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_discrepancy_center"))
    private PollingCenter pollingCenter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_discrepancy_org"))
    private Organization organization;

    @Column(name = "contest_id")
    private UUID contestId;

    // ===== DISCREPANCY CLASSIFICATION =====
    @Enumerated(EnumType.STRING)
    @Column(name = "discrepancy_type", nullable = false, length = 50)
    private DiscrepancyType discrepancyType;

    @Enumerated(EnumType.STRING)
    @Column(name = "reconciliation_phase", nullable = false, length = 20)
    private DiscrepancyReconciliationPhase reconciliationPhase;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    private DiscrepancySeverity severity;

    // ===== DISCREPANCY DETAILS =====
    @Column(name = "field_name", length = 100)
    private String fieldName;

    @Column(name = "expected_value")
    private String expectedValue;

    @Column(name = "actual_value")
    private String actualValue;

    @Column(name = "delta")
    private Integer delta;

    @Column(columnDefinition = "TEXT")
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "details", columnDefinition = "jsonb")
    private Map<String, Object> details;

    // ===== STATUS & RESOLUTION =====
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private DiscrepancyStatus status = DiscrepancyStatus.OPEN;

    @Enumerated(EnumType.STRING)
    @Column(name = "resolution_action", length = 30)
    private DiscrepancyResolutionAction resolutionAction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by")
    private SystemUser resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    // ===== AUDIT TRAIL =====
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private SystemUser createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // ===== CONVENIENCE METHODS =====
    @Transient
    public boolean isCritical() {
        return severity == DiscrepancySeverity.CRITICAL;
    }

    @Transient
    public boolean isResolved() {
        return status == DiscrepancyStatus.RESOLVED ||
                status == DiscrepancyStatus.ACCEPTED;
    }

    @Transient
    public boolean isOpen() {
        return status == DiscrepancyStatus.OPEN;
    }

}



