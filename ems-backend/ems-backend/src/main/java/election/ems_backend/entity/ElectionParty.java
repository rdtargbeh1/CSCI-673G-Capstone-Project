package election.ems_backend.entity;

import election.ems_backend.utility.ElectionPartyId;
import jakarta.persistence.*;
import lombok.*;


@Entity
@Table(
        name = "election_party",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "pk_election_party",
                        columnNames = {"election_id", "party_id"}
                )
        }
)

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ElectionParty {

    @EmbeddedId
    private ElectionPartyId id;


    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("electionId")
    @JoinColumn(name = "election_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "election_party_election_id_fkey"))
    private Election election;


    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("partyId")
    @JoinColumn(name = "party_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "election_party_party_id_fkey"))
    private Party party;


    @Column(name = "ballot_order")
    private Integer ballotOrder;

    @Column(name = "is_qualified", nullable = false)
    private boolean isQualified;

}
