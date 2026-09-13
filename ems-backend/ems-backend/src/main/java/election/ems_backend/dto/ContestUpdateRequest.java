package election.ems_backend.dto;

import election.ems_backend.enums.ContestCategory;
import election.ems_backend.enums.ContestScopeType;
import election.ems_backend.enums.ContestStatus;
import election.ems_backend.enums.ContestVoteMethod;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class ContestUpdateRequest {

    // allow update but service will gate it (e.g., forbid electionId change when not DRAFT)
    private UUID electionId;
    private String contestName;
    private ContestCategory category;
    private ContestScopeType scopeType;
    private UUID countyId;
    private UUID districtId;
    private ContestVoteMethod voteMethod;

    @Min(1)
    private Integer seats;

    @Min(1)
    private Integer maxSelections;
    private String description;
    private ContestStatus status;
    private Boolean isActive;
}
