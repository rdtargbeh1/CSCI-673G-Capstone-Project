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
 * ================================================================
 * CONTEST OPTION
 * ================================================================
 *
 * Purpose:
 * Represents one selectable option within an election contest.
 *
 * Supported option types:
 * - CANDIDATE -> references ElectionCandidate through elect_id
 * - LABEL     -> uses option_label and has no elect_id
 *
 * Important relationships:
 * - contest_id  -> contest.contest_id
 * - election_id -> election.election_id
 * - elect_id    -> election_candidate.elect_id
 *
 * election_id must always correspond to contest.election_id.
 * Database triggers provide a final integrity check.
 * ================================================================
 */
@Entity
@Table(
        name = "contest_option",
        indexes = {
                @Index(
                        name = "idx_contest_option_elect",
                        columnList = "elect_id"
                ),
                @Index(
                        name = "idx_contest_option_contest",
                        columnList = "contest_id"
                ),
                @Index(
                        name = "idx_contest_option_contest_active",
                        columnList = "contest_id,is_active"
                ),
                @Index(
                        name = "idx_contest_option_election",
                        columnList = "election_id"
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ContestOption {

    // ================================================================
    // PRIMARY KEY
    // ================================================================

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(
            name = "option_id",
            nullable = false,
            updatable = false
    )
    private UUID optionId;


    /**
     * Owning contest.
     *
     * This is the writable FK used during create/update operations.
     */
    @Column(name = "contest_id", nullable = false)
    private UUID contestId;

    /**
     * Read-only relationship convenience.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contest_id", insertable = false,
            updatable = false, foreignKey = @ForeignKey(name = "fk_contest_option_contest")
    )
    private Contest contest;

    /**
     * Election owning this contest option.
     *
     * Must match:
     * contest.election_id
     *
     * Bulk creation should populate this value from the Contest.
     */
    @Column(name = "election_id", nullable = false)
    private UUID electionId;


    /**
     * Read-only Election relationship.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "election_id", insertable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_contest_option_election"))
    private Election election;

    @Enumerated(EnumType.STRING)
    @Column(name = "option_type", nullable = false, length = 20)
    @Builder.Default
    private ContestOptionType optionType = ContestOptionType.CANDIDATE;

    /**
     * ElectionCandidate reference.
     *
     * This is NOT candidate.candidate_id.
     *
     * elect_id references:
     * election_candidate.elect_id
     */
    @Column(name = "elect_id")
    private UUID electId;


    /**
     * Read-only ElectionCandidate convenience relationship.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "elect_id", insertable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_contest_option_election_candidate"))
    private ElectionCandidate electionCandidate;

    /**
     * Used only when option_type = LABEL.
     */
    @Column(name = "option_label", length = 255)
    private String optionLabel;

    /**
     * Display/order position within the contest.
     */
    @Column(name = "option_order", nullable = false)
    @Builder.Default
    private Integer optionOrder = 1;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @CreationTimestamp
    @Column(name = "date_created", nullable = false, updatable = false)
    private LocalDateTime dateCreated;


    @UpdateTimestamp
    @Column(name = "date_updated", nullable = false)
    private LocalDateTime dateUpdated;

    @PrePersist
    public void prePersist() {

        if (optionType == null) {
            optionType = ContestOptionType.CANDIDATE;
        }

        if (optionOrder == null) {
            optionOrder = 1;
        }

        normalizeOptionFields();
    }


    @PreUpdate
    public void preUpdate() {
        normalizeOptionFields();
    }


    /**
     * Keep candidate and label option models mutually exclusive.
     */
    private void normalizeOptionFields() {

        if (optionType == ContestOptionType.CANDIDATE) {
            optionLabel = null;
        }

        if (optionType == ContestOptionType.LABEL) {
            electId = null;
        }
    }
}


