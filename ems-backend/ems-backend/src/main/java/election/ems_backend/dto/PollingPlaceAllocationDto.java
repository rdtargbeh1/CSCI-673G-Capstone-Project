package election.ems_backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class PollingPlaceAllocationDto {

    // ========================================================================
    // ALLOCATION
    // ========================================================================

    private UUID placeAllocationId;


    // ========================================================================
    // ELECTION
    // ========================================================================

    private UUID electionId;
    private String electionName;
    private int year;


    // ========================================================================
    // POLLING PLACE
    // ========================================================================

    private UUID placeId;
    private String placeCode;
    private Integer placeNumber;
    private String placeLabel;


    // ========================================================================
    // POLLING CENTER
    // ========================================================================

    private UUID centerId;
    private String centerCode;
    private String centerName;


    // ========================================================================
    // DISTRICT
    // ========================================================================

    private UUID districtId;
    private String districtName;


    // ========================================================================
    // COUNTY
    // ========================================================================

    private UUID countyId;
    private String countyName;
    // ========================================================================
    // ALLOCATION VALUES
    // ========================================================================

    private int registeredVoters;
    private Integer ballotsIssued;


    // ========================================================================
    // AUDIT
    // ========================================================================

    private LocalDateTime dateCreated;
    private LocalDateTime dateUpdated;

    private String createdBy;
    private String createdByName;

    private String updatedBy;
    private String updatedByName;

    private boolean active;

    private Integer version;
}