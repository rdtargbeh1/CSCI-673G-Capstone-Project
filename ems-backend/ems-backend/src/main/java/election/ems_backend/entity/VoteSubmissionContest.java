package election.ems_backend.entity;


import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Maps to submission_contest_vote table.
 */
@Entity
@Table(
        name = "vote_submission_contest",
        indexes = {
                @Index(name = "idx_scv_submission", columnList = "submission_id"),
                @Index(name = "idx_scv_org_elec_contest", columnList = "org_id, election_id, contest_id"),
                @Index(name = "idx_scv_contest_option", columnList = "contest_id, option_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VoteSubmissionContest {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "scv_id", nullable = false, updatable = false)
    private UUID scvId;

    // ---------- explicit FK columns (write-safe) ----------
    @Column(name = "submission_id", nullable = false)
    private UUID submissionId;

    @Column(name = "org_id", nullable = false)
    private UUID orgId;

    @Column(name = "election_id", nullable = false)
    private UUID electionId;

    @Column(name = "contest_id", nullable = false)
    private UUID contestId;

    @Column(name = "option_id", nullable = false)
    private UUID optionId;

    // vote_value >= 0 (DB constraint). default 0 in SQL.
    @Column(name = "vote_value", nullable = false)
    private Integer voteValue = 0;

    // rank >= 1 when provided (DB constraint). For non-ranked contests, rank must be NULL (DB trigger enforces).
    @Column(name = "rank")
    private Integer rank;

    @CreationTimestamp
    @Column(name = "date_created", nullable = false, updatable = false)
    private LocalDateTime dateCreated;

    // ---------- read-only convenience relations (optional) ----------
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id", insertable = false, updatable = false)
    private VoteSubmission submission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", insertable = false, updatable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "election_id", insertable = false, updatable = false)
    private Election election;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contest_id", insertable = false, updatable = false)
    private Contest contest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "option_id", insertable = false, updatable = false)
    private ContestOption option;

    @PrePersist
    public void prePersist() {
        // keep aligned with SQL default: vote_value default 0
        if (voteValue == null) voteValue = 0;
    }
}