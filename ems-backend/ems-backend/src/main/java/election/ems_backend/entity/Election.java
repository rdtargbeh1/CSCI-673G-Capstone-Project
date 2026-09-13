package election.ems_backend.entity;

import election.ems_backend.enums.ElectionAccessStatus;
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
                @UniqueConstraint(name = "uq_election_name_year",
                        columnNames = {"election_name", "year"})
        },
        indexes = {
                @Index(name = "idx_election_year", columnList = "year"),
                @Index(name = "idx_election_type", columnList = "type"),
                @Index(name = "idx_election_access_status", columnList = "access_status"),
                @Index(name = "idx_election_active", columnList = "is_active"),
                @Index(name = "idx_election_available_at", columnList = "available_at"),
                @Index(name = "idx_election_start_at", columnList = "start_at"),
                @Index(name = "idx_election_end_at", columnList = "end_at"),
                @Index(name = "idx_election_available_until", columnList = "available_until")
        }
)
@EntityListeners(AuditingEntityListener.class)
public class Election extends BaseAuditedEntity {

    // ========================================================================
    // IDENTITY
    // ========================================================================

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "election_id", nullable = false, updatable = false, columnDefinition = "uuid")
    private UUID electionId;


    // ========================================================================
    // BASIC INFORMATION
    // ========================================================================

    @Column(name = "election_name", nullable = false, length = 100)
    private String electionName;


    @Min(1900)
    @Column(name = "year", nullable = false)
    private int year;


    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 50)
    private ElectionType electionType;


    // ========================================================================
    // ADMINISTRATIVE STATUS
    // ========================================================================

    /**
     * Administrative / technical switch.
     *
     * This is separate from election access status.
     *
     * false:
     * - Election may be temporarily disabled.
     *
     * true:
     * - Election is technically enabled.
     *
     * This field must NOT be used to determine whether the election
     * is DRAFT, AVAILABLE, ARCHIVED, or CANCELLED.
     */
    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private boolean isActive = false;


    // ========================================================================
    // ELECTION ACCESS / LIFECYCLE
    // ========================================================================

    /**
     * Broad election access state.
     *
     * DRAFT:
     * NEC is still configuring the election.
     *
     * AVAILABLE:
     * Election has been released to permitted organizations.
     *
     * ARCHIVED:
     * Election is historical/read-only for normal operations.
     *
     * CANCELLED:
     * Election has been cancelled.
     *
     * Result publication is NOT controlled here.
     * NECResult controls official result publication independently.
     */
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "access_status", nullable = false, length = 30)
    private ElectionAccessStatus accessStatus = ElectionAccessStatus.DRAFT;


    /**
     * Date/time NEC makes this election available to tenant organizations.
     *
     * Before this point:
     * - NEC may continue configuration.
     * - tenant organizations should not access the election.
     *
     * This may occur before the election operational start time.
     */
    @Column(name = "available_at")
    private LocalDateTime availableAt;


    /**
     * Beginning of the election operational window.
     *
     * This represents when normal election operations begin.
     *
     * It is different from availableAt because NEC may release election
     * setup information to tenant organizations before operations begin.
     */
    @Column(name = "start_at")
    private LocalDateTime startAt;


    /**
     * End of the election operational window.
     *
     * Normal election-day operational activities should stop after
     * this point.
     *
     * Post-election workflows may continue until availableUntil.
     */
    @Column(name = "end_at")
    private LocalDateTime endAt;


    /**
     * Final date/time that this election remains actively available.
     *
     * This allows post-election activities to continue after endAt.
     *
     * When this time expires, the election may automatically transition
     * from AVAILABLE to ARCHIVED.
     */
    @Column(name = "available_until")
    private LocalDateTime availableUntil;


    /**
     * Actual date/time the election entered ARCHIVED state.
     *
     * This may be set automatically when availableUntil expires
     * or manually by an authorized administrator.
     */
    @Column(name = "archived_at")
    private LocalDateTime archivedAt;


    /**
     * Optional explanation for why the election was archived.
     *
     * Useful for manual or exceptional archive actions.
     */
    @Column(name = "archived_reason", length = 250)
    private String archivedReason;


    // ========================================================================
    // BALLOT CONFIGURATION
    // ========================================================================

    /**
     * NEC-configurable spare ballots percentage.
     *
     * Example:
     *
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
    @Builder.Default
    @Column(name = "enforce_ballots_gte_registered", nullable = false)
    private boolean enforceBallotsGteRegistered = true;


    // ========================================================================
    // AUDIT TIMESTAMPS
    // ========================================================================

    @Column(name = "date_created", nullable = false, updatable = false)
    private LocalDateTime dateCreated;


    @Column(name = "date_updated", nullable = false)
    private LocalDateTime dateUpdated;


    // ========================================================================
    // AUDIT USERS
    // ========================================================================

    /**
     * Internal audit value.
     *
     * The Spring AuditorAware implementation may store the authenticated
     * SystemUser UUID as a String.
     *
     * The API DTO may later resolve this to the actual user's name.
     */
    @CreatedBy
    @Column(name = "created_by", length = 120, updatable = false)
    private String createdBy;


    /**
     * Internal audit value for the last user who updated this election.
     *
     * The API DTO may resolve this value to a human-readable user name.
     */
    @LastModifiedBy
    @Column(name = "updated_by", length = 120)
    private String updatedBy;


    // ========================================================================
    // VERSIONING
    // ========================================================================

    /**
     * Optimistic locking.
     *
     * Prevents one administrator from silently overwriting changes
     * made by another administrator.
     */
    @Version
    @Column(name = "version", nullable = false)
    private Integer version;


    // ========================================================================
    // ENTITY CALLBACKS
    // ========================================================================

    @PrePersist
    public void onCreate() {

        LocalDateTime now =
                LocalDateTime.now();

        if (dateCreated == null) {
            dateCreated = now;
        }

        if (dateUpdated == null) {
            dateUpdated = now;
        }

        if (accessStatus == null) {
            accessStatus =
                    ElectionAccessStatus.DRAFT;
        }
    }


    @PreUpdate
    public void onUpdate() {

        dateUpdated =
                LocalDateTime.now();
    }


    // ========================================================================
    // TIME / ACCESS HELPERS
    // ========================================================================

    /**
     * Returns true when the election has not yet reached its
     * operational start time.
     *
     * This does not determine authorization by itself.
     */
    @Transient
    public boolean isBeforeOperationalWindow() {

        if (startAt == null) {
            return false;
        }

        return LocalDateTime.now()
                .isBefore(startAt);
    }


    /**
     * Returns true while the current time is within the configured
     * election operational window.
     *
     * Boundary behavior:
     *
     * startAt <= now <= endAt
     */
    @Transient
    public boolean isWithinOperationalWindow() {

        if (startAt == null || endAt == null) {
            return false;
        }

        LocalDateTime now =
                LocalDateTime.now();

        return !now.isBefore(startAt)
                && !now.isAfter(endAt);
    }


    /**
     * Returns true when the normal operational election window
     * has ended.
     */
    @Transient
    public boolean isAfterOperationalWindow() {

        if (endAt == null) {
            return false;
        }

        return LocalDateTime.now()
                .isAfter(endAt);
    }


    /**
     * Returns true when this election has reached or passed
     * its configured archive deadline.
     *
     * This helper does NOT modify the entity.
     *
     * The service/scheduled archive process should perform the actual
     * AVAILABLE -> ARCHIVED state transition.
     */
    @Transient
    public boolean isArchiveDue() {

        if (availableUntil == null) {
            return false;
        }

        return !LocalDateTime.now()
                .isBefore(availableUntil);
    }


    /**
     * Returns true when tenant availability time has been reached.
     *
     * Actual tenant authorization must still be enforced by the
     * election access policy/service.
     */
    @Transient
    public boolean hasReachedAvailableTime() {

        if (availableAt == null) {
            return false;
        }

        return !LocalDateTime.now()
                .isBefore(availableAt);
    }


    /**
     * Convenience indicator for historical state.
     */
    @Transient
    public boolean isArchived() {

        return accessStatus ==
                ElectionAccessStatus.ARCHIVED;
    }


    /**
     * Convenience indicator for draft state.
     */
    @Transient
    public boolean isDraft() {

        return accessStatus ==
                ElectionAccessStatus.DRAFT;
    }


    /**
     * Convenience indicator for tenant-available state.
     */
    @Transient
    public boolean isAvailable() {

        return accessStatus ==
                ElectionAccessStatus.AVAILABLE;
    }


    /**
     * Convenience indicator for cancelled state.
     */
    @Transient
    public boolean isCancelled() {

        return accessStatus ==
                ElectionAccessStatus.CANCELLED;
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