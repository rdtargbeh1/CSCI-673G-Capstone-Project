package election.ems_backend.entity;

import election.ems_backend.enums.ElectionType;
import election.ems_backend.security.BaseAuditedEntity;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder

@Entity
@Table(
        name = "election",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_election_name_year",
                        columnNames = {
                                "election_name",
                                "year"
                        }
                )
        }
)
@EntityListeners(AuditingEntityListener.class)
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
     * NEC-configurable spare ballots percentage.
     *
     * Example:
     * 20 = registered voters + maximum 20% spare ballots.
     *
     * Null means NEC has not configured an upper spare-ballot cap.
     */
    @Column(name = "ballot_spare_percent")
    private Integer ballotSparePercent;


    /**
     * Liberia default:
     *
     * ballotsIssued >= registeredVoters
     *
     * This remains configurable per election.
     */
    @Column(name = "enforce_ballots_gte_registered", nullable = false)
    private boolean enforceBallotsGteRegistered = true;

    @Column(name = "date_created", nullable = false, updatable = false)
    private LocalDateTime dateCreated;

    @Column(name = "date_updated", nullable = false)
    private LocalDateTime dateUpdated;


    /**
     * Internal audit value.
     *
     * The Spring AuditorAware implementation may currently store
     * the authenticated SystemUser UUID as a String.
     *
     * This raw value is preserved internally.
     *
     * The API DTO will resolve it to the actual user's name.
     */
    @CreatedBy
    @Column(name = "created_by", length = 120, updatable = false)
    private String createdBy;


    /**
     * Internal audit value for the last user who updated this election.
     *
     * The API DTO resolves this value to a human-readable user name.
     */
    @LastModifiedBy
    @Column(name = "updated_by", length = 120)
    private String updatedBy;

    @PrePersist
    public void onCreate() {

        LocalDateTime now =
                LocalDateTime.now();


        if (dateCreated == null) {
            dateCreated =
                    now;
        }


        if (dateUpdated == null) {
            dateUpdated =
                    now;
        }
    }


    @PreUpdate
    public void onUpdate() {
        dateUpdated =
                LocalDateTime.now();
    }


    // ========================================================================
    // DISPLAY
    // ========================================================================

    @Transient
    public String getDisplayLabel() {

        return electionName
                + " ("
                + year
                + ")";
    }
}