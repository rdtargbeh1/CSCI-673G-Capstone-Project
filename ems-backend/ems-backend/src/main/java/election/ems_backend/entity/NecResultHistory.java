package election.ems_backend.entity;


import election.ems_backend.enums.ChangeType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;


import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "nec_result_history",
        indexes = {
                @Index(name = "idx_nrh_result_id", columnList = "result_id"),
                @Index(name = "idx_nrh_election_id", columnList = "election_id")
        })
@Getter
@Setter
@NoArgsConstructor
public class NecResultHistory {

    @Id
    @Column(name = "history_id", nullable = false)
    private UUID historyId;

    @Column(name = "result_id", nullable = false)
    private UUID resultId;

    @Column(name = "election_id", nullable = false)
    private UUID electionId;

    @Column(name = "center_id", nullable = false)
    private UUID centerId;

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

    @Enumerated(EnumType.STRING)
    @Column(name = "change_type", length = 32, nullable = false)
    private ChangeType changeType;

    @Column(name = "changed_by")
    private UUID changedBy;

    @Column(name = "changed_at")
    private LocalDateTime changedAt;

    @Column(name = "notes", columnDefinition = "text")
    private String notes;

    @PrePersist
    public void prePersist() {
        if (historyId == null) historyId = UUID.randomUUID();
        if (changedAt == null) changedAt = LocalDateTime.now();
    }
}