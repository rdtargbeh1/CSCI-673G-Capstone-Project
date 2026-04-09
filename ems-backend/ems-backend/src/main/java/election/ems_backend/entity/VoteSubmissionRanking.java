package election.ems_backend.entity;


import com.fasterxml.jackson.databind.JsonNode;
import election.ems_backend.utility.JsonNodeConverter;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Maps to submission_vote_ranking table.
 *
 * ranking stores a JSON array (JSONB) — each entry should be an option identifier (UUID) in the contest_option table
 * or otherwise an identifier your system understands for ranked ballots.
 *
 * Important assumptions:
 * - The ranking JSON is an array (checked at DB level by CHECK constraint).
 * - The service validates that each array element is a valid UUID and that the option exists for the contestId.
 */
@Entity
@Table(
        name = "vote_submission_ranking",
        indexes = {
                @Index(name = "idx_svr_submission", columnList = "submission_id"),
                @Index(name = "idx_svr_contest", columnList = "contest_id")
        },
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "idx_svr_submission_contest_unique",
                        columnNames = {"submission_id", "contest_id"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VoteSubmissionRanking {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "svr_id", nullable = false, updatable = false)
    private UUID svrId;

    // ---------- explicit FK columns ----------
    @Column(name = "submission_id", nullable = false)
    private UUID submissionId;

    @Column(name = "contest_id", nullable = false)
    private UUID contestId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contest_id", insertable = false, updatable = false)
    private Contest contest;

    // ---------- JSON ranking (ordered list of optionIds) ----------
    @Convert(converter = JsonNodeConverter.class)
    @Column(name = "ranking", columnDefinition = "jsonb", nullable = false)
    private JsonNode ranking;

    @CreationTimestamp
    @Column(name = "date_created", nullable = false, updatable = false)
    private LocalDateTime dateCreated;

    // ---------- read-only convenience relations ----------
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id", insertable = false, updatable = false)
    private VoteSubmission submission;


}