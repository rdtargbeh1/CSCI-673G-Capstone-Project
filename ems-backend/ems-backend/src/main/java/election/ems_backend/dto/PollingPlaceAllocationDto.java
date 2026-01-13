package election.ems_backend.dto;


import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class PollingPlaceAllocationDto {

    private UUID placeAllocationId;

    private UUID electionId;
    private String electionName;
    private int year;

    private UUID placeId;
    private String placeCode;
    private Integer placeNumber;
    private String placeLabel;

    private UUID centerId;
    private String centerCode;
    private String centerName;

    private int registeredVoters;
    private Integer ballotsIssued;
}
