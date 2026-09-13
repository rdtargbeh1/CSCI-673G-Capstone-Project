package election.ems_backend.entity;


import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Entity
@Table(
        name = "polling_center_allocation",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_alloc_election_center",
                columnNames = {"election_id","center_id"}
        ),
        indexes = {
                @Index(name = "idx_alloc_election", columnList = "election_id"),
                @Index(name = "idx_alloc_center", columnList = "center_id")
        }
)

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PollingCenterAllocation extends AuditBaseEntity{

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "allocation_id", nullable = false, updatable = false)
    private UUID allocationId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "election_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_allocation_election"))
    private Election election;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "center_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_allocation_center"))
    private PollingCenter pollingCenter;;

    @Min(0)
    @Column(name = "registered_voters", nullable = false)
    private int registeredVoters;

    @Column(name = "ballots_issued")
    private Integer ballotsIssued;

    @PrePersist
    public void prePersist() {
        if (ballotsIssued == null) ballotsIssued = 0;
    }
}