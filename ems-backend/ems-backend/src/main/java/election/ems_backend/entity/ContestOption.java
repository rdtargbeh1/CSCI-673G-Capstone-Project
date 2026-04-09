package election.ems_backend.entity;

import election.ems_backend.enums.ContestOptionType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Minimal mapping for contest_option table used when normalizing submissions.
 * Fields chosen to match SQL usage in submission normalization:
 *  - optionId  -> option_id (PK)
 *  - contestId -> contest_id
 *  - candidateId -> candidate_id
 *
 * Keep this lightweight (no relationships) so normalization logic can resolve candidate -> option.
 */
@Entity
@Table(
        name = "contest_option",
        indexes = {
                @Index(name = "idx_contest_option_candidate", columnList = "candidate_id"),
                @Index(name = "idx_contest_option_contest", columnList = "contest_id"),
                @Index(name = "idx_contest_option_contest_active", columnList = "contest_id,is_active")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContestOption {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "option_id", nullable = false, updatable = false)
    private UUID optionId;

    // explicit FK column for simple writes
    @Column(name = "contest_id", nullable = false)
    private UUID contestId;

    // read-only relationship convenience
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contest_id", insertable = false, updatable = false)
    private Contest contest;

    @Column(name = "election_id", nullable = false)
    private UUID electionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "election_id", insertable = false, updatable = false)
    private Election election;


    @Enumerated(EnumType.STRING)
    @Column(name = "option_type", nullable = false, length = 20)
    private ContestOptionType optionType = ContestOptionType.CANDIDATE;

    // optional candidate reference
    @Column(name = "elect_id")
    private UUID electId;

    // read-only convenience (safe)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "elect_id", insertable = false, updatable = false)
    private ElectionCandidate electionCandidate;

    @Column(name = "option_label", length = 255)
    private String optionLabel;

    @Column(name = "option_order", nullable = false)
    private Integer optionOrder;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @CreationTimestamp
    @Column(name = "date_created", nullable = false, updatable = false)
    private LocalDateTime dateCreated;

    @UpdateTimestamp
    @Column(name = "date_updated", nullable = false)
    private LocalDateTime dateUpdated;

    @PrePersist
    public void prePersist() {
        if (optionType == null) optionType = ContestOptionType.CANDIDATE;
        if (optionOrder == null) optionOrder = 1;
        // DB check constraints remain the final gate
        if (optionType == ContestOptionType.CANDIDATE) {
            // candidateId must be present (DB also enforces)
            optionLabel = null; // keep clean
        }
        if (optionType == ContestOptionType.LABEL) {
            // label must be present, candidateId must be null (DB also enforces)
            electId = null;
        }
    }

    @PreUpdate
    public void preUpdate() {
        if (optionType == ContestOptionType.CANDIDATE) {
            optionLabel = null;
        }
        if (optionType == ContestOptionType.LABEL) {
            electId = null;
        }
    }
}