package election.ems_backend.dto;

import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PollingPlaceAllocationUpdateRequest {

    @Min(0)
    private Integer registeredVoters;

    @Min(0)
    private Integer ballotsIssued;
}
