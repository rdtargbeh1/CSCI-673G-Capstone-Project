package election.ems_backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;


@Entity
@Table(name = "vote_tally")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class VoteTally {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "tally_id", nullable = false, updatable = false)
    private UUID tallyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "election_id", nullable = false,
            foreignKey = @ForeignKey(name = "vote_tally_election_id_fkey"))
    private Election election;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", nullable = false,
            foreignKey = @ForeignKey(name = "vote_tally_org_id_fkey"))
    private Organization organization;

    // -------------------------
    // ✅ WRITE-SAFE FK COLUMNS
    // -------------------------

    @Column(name = "contest_id", nullable = false)
    private UUID contestId;

    @Column(name = "elect_id", nullable = false) // DB requires NOT NULL
    private UUID electId;

    @Column(name = "party_id") // optional (can be null if independent)
    private UUID partyId;

    // -------------------------
    // ✅ READ-ONLY RELATIONSHIPS
    // -------------------------

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contest_id", insertable = false, updatable = false)
    private Contest contest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "elect_id", insertable = false, updatable = false,
            foreignKey = @ForeignKey(name = "vote_tally_elect_id_fkey"))
    private ElectionCandidate electionCandidate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumns({
            @JoinColumn(name = "election_id", referencedColumnName = "election_id", insertable = false, updatable = false),
            @JoinColumn(name = "party_id", referencedColumnName = "party_id", insertable = false, updatable = false)
    })
    private ElectionParty electionParty;


    @NotNull
    @Min(0)
    @Column(name = "vote_count", nullable = false)
    private Integer voteCount;

    @Column(name = "last_recomputed_at", nullable = false)
    private LocalDateTime lastRecomputedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recomputed_by",
            foreignKey = @ForeignKey(name = "vote_tally_recomputed_by_fkey"))
    private SystemUser recomputedBy;

    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;

    @PrePersist
    public void prePersist() {
        if (lastUpdated == null) lastUpdated = LocalDateTime.now();
    }
}



