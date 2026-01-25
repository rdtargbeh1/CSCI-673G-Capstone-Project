package election.ems_backend.entity;

import election.ems_backend.enums.ElectionType;
import election.ems_backend.security.BaseAuditedEntity;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
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
@Table(name = "election",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_election_name_year",
                        columnNames = {"election_name", "year"})
        })
public class Election extends BaseAuditedEntity {
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "election_id", nullable = false, updatable = false, columnDefinition = "uuid")
    private UUID electionId;

    @Column(name = "election_name", nullable = false, length = 100)
    private String electionName;

    @Min(1900)
    @Column(name = "year", nullable = false)
    private int year;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 50)
    private ElectionType electionType;

    @Column(name = "is_active", nullable = false)
    private boolean isActive;

    /**
     * ✅ NEC-configurable spare ballots percent (e.g., 20 = +20%).
     * If null => no spare cap enforced (NEC hasn’t set policy yet).
     */
    @Column(name = "ballot_spare_percent")
    private Integer ballotSparePercent;

    /**
     * ✅ Liberia default: ballotsIssued should be >= registeredVoters.
     * Keep configurable per election to match NEC policy changes.
     */
    @Column(name = "enforce_ballots_gte_registered", nullable = false)
    private boolean enforceBallotsGteRegistered = true;

    // Simple audit stamps (optional)
    @Column(name = "date_created", nullable = false)
    private LocalDateTime dateCreated;

    @Column(name = "date_updated", nullable = false)
    private LocalDateTime dateUpdated;


    @PrePersist
    public void onCreate() {
        var now = LocalDateTime.now();
        dateCreated = now;
        dateUpdated = now;

        // safety defaults
        if (!enforceBallotsGteRegistered) {
            // keep whatever caller set; no-op
        }
    }


    @PreUpdate
    public void onUpdate() {
        dateUpdated = LocalDateTime.now();
    }

    // Optional: nice label for dropdowns
    @Transient
    public String getDisplayLabel() {
        return electionName + " (" + year + ")";
    }
}
