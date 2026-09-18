package election.ems_backend.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter @Setter
public class PollingCenterAllocationCreateRequest {
    @NotNull private UUID electionId;
    @NotNull private UUID centerId;
    @Min(0) private int registeredVoters;
    @Min(0) private Integer ballotsIssued; // optional
}