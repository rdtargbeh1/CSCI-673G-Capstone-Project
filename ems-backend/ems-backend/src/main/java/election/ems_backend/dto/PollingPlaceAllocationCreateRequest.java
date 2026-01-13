package election.ems_backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class PollingPlaceAllocationCreateRequest {

    @NotNull
    private UUID electionId;

    @NotNull
    private UUID placeId;

    @Min(0)
    private int registeredVoters;

    @Min(0)
    private Integer ballotsIssued;
}
