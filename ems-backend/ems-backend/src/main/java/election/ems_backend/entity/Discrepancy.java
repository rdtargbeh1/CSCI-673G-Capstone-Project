package election.ems_backend.entity;

import election.ems_backend.enums.DiscrepancyStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder

@Entity
@Table(name = "discrepancy")
public class Discrepancy {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "disc_id", nullable = false, updatable = false)
    private UUID discId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "election_id", nullable = false,
            foreignKey = @ForeignKey(name = "discrepancy_election_id_fkey"))
    private Election election;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "center_id", nullable = false,
            foreignKey = @ForeignKey(name = "discrepancy_center_id_fkey"))
    private PollingCenter pollingCenter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id",
            foreignKey = @ForeignKey(name = "discrepancy_org_id_fkey"))
    private Organization organization; // nullable (ON DELETE SET NULL)

    @Column(name = "party_valid")
    private Integer partyValid;          // nullable per SQL

    @Column(name = "official_valid")
    private Integer officialValid;       // nullable per SQL

    @Column(name = "party_invalid")
    private Integer partyInvalid;        // nullable per SQL

    @Column(name = "official_invalid")
    private Integer officialInvalid;     // nullable per SQL

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    private DiscrepancyStatus status = DiscrepancyStatus.OPEN;

    @Column(name = "noted_at")
    private LocalDateTime notedAt;

    @PrePersist
    void prePersist() {
        if (notedAt == null) notedAt = LocalDateTime.now();
    }

    /** --- Convenience derived values (not persisted) --- */
    @Transient
    public Integer getDeltaValid() {
        if (partyValid == null || officialValid == null) return null;
        return partyValid - officialValid;
    }

    @Transient
    public Integer getDeltaInvalid() {
        if (partyInvalid == null || officialInvalid == null) return null;
        return partyInvalid - officialInvalid;
    }
}
