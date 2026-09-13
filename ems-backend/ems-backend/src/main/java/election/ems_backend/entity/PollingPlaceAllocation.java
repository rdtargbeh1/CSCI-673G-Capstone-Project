package election.ems_backend.entity;



import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Entity
@Table(
        name = "polling_place_allocation",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_place_alloc_election_place",
                        columnNames = {"election_id", "place_id"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PollingPlaceAllocation extends AuditBaseEntity {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "place_allocation_id", nullable = false, updatable = false)
    private UUID placeAllocationId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "election_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_place_alloc_election")
    )
    private Election election;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "place_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_place_alloc_place")
    )
    private PollingPlace pollingPlace;

    @Min(0)
    @Column(name = "registered_voters", nullable = false)
    private int registeredVoters;

    @Column(name = "ballots_issued", nullable = false)
    private Integer ballotsIssued = 0;

    @PrePersist
    public void prePersist() {
        if (ballotsIssued == null) ballotsIssued = 0;
    }
}
