package election.ems_backend.entity;

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
@Table(name = "election",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_election_name_year",
                        columnNames = {"election_name", "year"})
        })
public class Election extends election.ems_backend.security.BaseAuditedEntity {
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
    private election.ems_backend.enums.ElectionType electionType;

    @Column(name = "is_active", nullable = false)
    private boolean isActive;

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
