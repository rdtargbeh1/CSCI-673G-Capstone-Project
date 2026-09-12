package election.ems_backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import election.ems_backend.enums.ElectionAccessStatus;
import election.ems_backend.enums.ElectionType;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ElectionDto {

    // ========================================================================
    // ELECTION
    // ========================================================================

    private UUID electionId;

    private String electionName;

    private int year;

    private ElectionType electionType;

    private boolean isActive;


    // ========================================================================
    // ACCESS / LIFECYCLE
    // ========================================================================

    /**
     * Broad election access state:
     *
     * DRAFT
     * AVAILABLE
     * ARCHIVED
     * CANCELLED
     */
    private ElectionAccessStatus accessStatus;


    /**
     * When NEC makes the election available to permitted
     * tenant organizations.
     */
    private LocalDateTime availableAt;


    /**
     * Beginning of the election operational window.
     */
    private LocalDateTime startAt;


    /**
     * End of the election operational window.
     */
    private LocalDateTime endAt;


    /**
     * Final active availability time before the election
     * becomes eligible for archive.
     */
    private LocalDateTime availableUntil;


    /**
     * Actual archive timestamp.
     */
    private LocalDateTime archivedAt;


    /**
     * Optional reason for manual or exceptional archive.
     */
    private String archivedReason;


    // ========================================================================
    // COMPUTED STATE
    // ========================================================================

    /**
     * True when current time is before startAt.
     */
    private boolean beforeOperationalWindow;


    /**
     * True when current time is within:
     *
     * startAt <= now <= endAt
     */
    private boolean withinOperationalWindow;


    /**
     * True after endAt.
     */
    private boolean afterOperationalWindow;


    /**
     * True when availableUntil has been reached or passed.
     */
    private boolean archiveDue;


    /**
     * True when availableAt has been reached.
     */
    private boolean availableTimeReached;


    // ========================================================================
    // BALLOT POLICY
    // ========================================================================

    private Integer ballotSparePercent;

    private boolean enforceBallotsGteRegistered;


    // ========================================================================
    // AUDIT
    // ========================================================================

    private LocalDateTime dateCreated;

    private LocalDateTime dateUpdated;

    /**
     * Raw audit value stored in the database.
     */
    private String createdBy;

    /**
     * Human-readable name of the user who created the election.
     */
    private String createdByName;

    /**
     * Raw audit value stored in the database.
     */
    private String updatedBy;

    /**
     * Human-readable name of the user who last updated the election.
     */
    private String updatedByName;


    // ========================================================================
    // OPTIMISTIC LOCKING
    // ========================================================================

    private Integer version;


    // ========================================================================
    // JSON ACTIVE PROPERTY
    // ========================================================================

    @JsonProperty("isActive")
    public boolean getIsActive() {
        return isActive;
    }


    @JsonProperty("isActive")
    public void setIsActive(
            boolean isActive
    ) {
        this.isActive = isActive;
    }
}