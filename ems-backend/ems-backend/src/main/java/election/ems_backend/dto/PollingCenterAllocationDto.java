package election.ems_backend.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class PollingCenterAllocationDto {
    private UUID allocationId;
    private UUID electionId;
    private String electionName;
    private Integer electionYear;
    private UUID pollingCenterId;
    private String centerCode;
    private String centerName;
    private UUID districtId;
    private String districtName;
    private UUID countyId;
    private String countyName;
    private int registeredVoters;
    private Integer ballotsIssued;
}
