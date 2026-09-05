package election.ems_backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
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

    private UUID electionId;
    private String electionName;
    private int year;
    private ElectionType electionType;
    private boolean isActive;


    // ========================================================================
    // BALLOT POLICY
    // ========================================================================

    private Integer ballotSparePercent;
    private boolean enforceBallotsGteRegistered;

    private LocalDateTime dateCreated;
    private LocalDateTime dateUpdated;


    /**
     * Raw audit value stored in the database.
     *
     * Keep this for backend traceability.
     * Frontend should normally display createdByName instead.
     */
    private String createdBy;

    /**
     * Human-readable name of the user who created the election.
     */
    private String createdByName;

    /**
     * Raw audit value stored in the database.
     *
     * Frontend should normally display updatedByName instead.
     */
    private String updatedBy;

    /**
     * Human-readable name of the user who last updated the election.
     */
    private String updatedByName;


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

        this.isActive =
                isActive;
    }
}