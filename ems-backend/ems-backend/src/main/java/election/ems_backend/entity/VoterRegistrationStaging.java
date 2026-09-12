package election.ems_backend.entity;


import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Staging entity for raw voter registration imports. Data here is expected to be validated
 * and then promoted into voter_registration by NEC operators.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "voter_registration_staging",
        indexes = {
                @Index(name = "idx_vrs_batch_id", columnList = "batch_id"),
                @Index(name = "idx_vrs_imported_by", columnList = "imported_by")
        })
public class VoterRegistrationStaging {

    @Id
    @Column(name = "staging_id", nullable = false)
    private UUID stagingId;

    @Column(name = "batch_id")
    private UUID batchId;

    @Column(name = "national_id")
    private String nationalId;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "dob")
    private LocalDate dob;

    @Column(name = "assigned_center_code")
    private String assignedCenterCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "imported_by", foreignKey = @ForeignKey(name = "fk_vrs_imported_by"))
    private SystemUser importedBy;

    @Column(name = "import_time")
    private LocalDateTime importTime;

    @Column(name = "validated")
    private Boolean validated;

    @Column(name = "validation_errors", columnDefinition = "text")
    private String validationErrors;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "validated_by", foreignKey = @ForeignKey(name = "fk_vrs_validated_by"))
    private SystemUser validatedBy;

    @Column(name = "validated_at")
    private LocalDateTime validatedAt;

    @Column(name = "processed")
    private Boolean processed;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processed_by", foreignKey = @ForeignKey(name = "fk_vrs_processed_by"))
    private SystemUser processedBy;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "processed_voter_id")
    private UUID processedVoterId;

    @PrePersist
    public void prePersist() {
        if (stagingId == null) stagingId = UUID.randomUUID();
        if (importTime == null) importTime = LocalDateTime.now();
        if (validated == null) validated = Boolean.FALSE;
        if (processed == null) processed = Boolean.FALSE;
    }
}
