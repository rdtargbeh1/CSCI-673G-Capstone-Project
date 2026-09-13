package election.ems_backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class PollingCenterAllocationBulkRequest {

    @NotNull
    private UUID electionId;

    @NotNull
    private UUID districtId;

    @NotEmpty
    @Valid
    private List<Item> allocations;

    @Getter
    @Setter
    public static class Item {

        @NotNull
        private UUID centerId;

        @Min(0)
        private int registeredVoters;

        @Min(0)
        private Integer ballotsIssued;
    }
}