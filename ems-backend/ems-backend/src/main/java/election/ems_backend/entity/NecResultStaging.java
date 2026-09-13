package election.ems_backend.entity;


import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Staging entity for NEC result uploads per centre.
 */

@Entity
@Table(name = "nec_result_staging",
        indexes = {
                @Index(name = "idx_nrs_election", columnList = "election_id"),
                @Index(name = "idx_nrs_center_code", columnList = "center_code"),
                @Index(name = "idx_nrs_processed_result_id", columnList = "processed_result_id")
        })
@Getter
@Setter
@NoArgsConstructor
public class NecResultStaging {

    @Id
    @Column(name = "staging_id", nullable = false)
    private UUID stagingId;

    @Column(name = "batch_id")
    private UUID batchId;

    @Column(name = "election_id", nullable = false)
    private UUID electionId;

    @Column(name = "center_code")
    private String centerCode;

    @Column(name = "assigned_center_id")
    private UUID assignedCenterId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "candidate_votes", columnDefinition = "jsonb")
    private Map<String, Integer> candidateVotes;

    @Column(name = "total_registered_voters")
    private Integer totalRegisteredVoters;

    @Column(name = "ballots_cast")
    private Integer ballotsCast;

    @Column(name = "invalid_ballots")
    private Integer invalidBallots;

    @Column(name = "unmarked_ballots")
    private Integer unmarkedBallots;

    @Column(name = "unused_ballots")
    private Integer unusedBallots;

    @Column(name = "rejected_ballots")
    private Integer rejectedBallots;

    @Column(name = "spoiled_ballots")
    private Integer spoiledBallots;

    @Column(name = "source")
    private String source;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by", foreignKey = @ForeignKey(name = "fk_nrs_uploaded_by"))
    private SystemUser uploadedBy;

    @Column(name = "upload_time")
    private LocalDateTime uploadTime;

    @Column(name = "validated")
    private Boolean validated;

    @Column(name = "validation_errors", columnDefinition = "text")
    private String validationErrors;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "validated_by", foreignKey = @ForeignKey(name = "fk_nrs_validated_by"))
    private SystemUser validatedBy;

    @Column(name = "validated_at")
    private LocalDateTime validatedAt;

    @Column(name = "is_published")
    private Boolean isPublished;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "published_by", foreignKey = @ForeignKey(name = "fk_nrs_published_by"))
    private SystemUser publishedBy;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "processed")
    private Boolean processed;

    @Column(name = "processed_result_id")
    private UUID processedResultId;


    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @PrePersist
    public void prePersist() {
        if (stagingId == null) stagingId = UUID.randomUUID();
        if (uploadTime == null) uploadTime = LocalDateTime.now();
        if (validated == null) validated = Boolean.FALSE;
        if (isPublished == null) isPublished = Boolean.FALSE;
        if (processed == null) processed = Boolean.FALSE;
    }
}