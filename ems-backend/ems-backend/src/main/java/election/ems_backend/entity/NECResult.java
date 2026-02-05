package election.ems_backend.entity;


import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder

@Entity
@Table(
        name = "nec_result",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_nec_election_contest_center", columnNames = {"election_id", "contest_id", "center_id"})
        },
        indexes = {
                @Index(name = "idx_nec_result_election", columnList = "election_id"),
                @Index(name = "idx_nec_result_center", columnList = "center_id"),
                @Index(name = "idx_nec_result_upload_time", columnList = "upload_time")
        }
)
public class NECResult {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "result_id", updatable = false, nullable = false)
    private UUID resultId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "election_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_nec_election"))
    private Election election;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contest_id", nullable = false)
    private Contest contest;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "center_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_nec_center"))
    private PollingCenter pollingCenter;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "candidate_votes", columnDefinition = "jsonb", nullable = false)
    private JsonNode candidateVotes;
    
    @Column(name = "total_registered_voters", nullable = false)
    private Integer totalRegisteredVoters;

    @Column(name = "ballots_cast", nullable = false)
    private Integer ballotsInBox;

    @Column(name = "invalid_ballots", nullable = false)
    private Integer invalidBallots = 0;

    @Column(name = "unmarked_ballots", nullable = false)
    private Integer unmarkedBallots = 0;

    @Column(name = "unused_ballots", nullable = false)
    private Integer unusedBallots = 0;

    @Column(name = "rejected_ballots", nullable = false)
    private Integer rejectedBallots = 0;

    @Column(name = "spoiled_ballots", nullable = false)
    private Integer spoiledBallots = 0;

    @Column(name = "source", nullable = false, length = 100)
    private String source;

    @Column(name = "upload_time")
    private LocalDateTime uploadTime = LocalDateTime.now();

    @Column(name = "is_published", nullable = false)
    private boolean isPublished = false;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "published_until")
    private LocalDateTime publishedUntil;

    // cryptographic
    @Column(name = "result_signature")
    private String resultSignature;

    @Column(name = "result_signer_key_id")
    private UUID resultSignerKeyId;

    @Column(name = "chain_hash")
    private String chainHash;


    @PrePersist
    public void prePersist() {
        if (uploadTime == null) uploadTime = LocalDateTime.now();
        if (invalidBallots == null) invalidBallots = 0;
        if (unmarkedBallots == null) unmarkedBallots = 0;
        if (rejectedBallots == null) rejectedBallots = 0;
        if (spoiledBallots == null) spoiledBallots = 0;
        if (unusedBallots == null) unusedBallots = 0;
        if (totalRegisteredVoters == null) totalRegisteredVoters = 0;
        if (ballotsInBox == null) ballotsInBox = 0;
    }



}
