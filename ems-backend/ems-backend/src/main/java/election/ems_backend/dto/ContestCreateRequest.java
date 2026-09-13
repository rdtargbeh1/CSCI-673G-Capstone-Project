package election.ems_backend.dto;

import election.ems_backend.enums.ContestCategory;
import election.ems_backend.enums.ContestScopeType;
import election.ems_backend.enums.ContestStatus;
import election.ems_backend.enums.ContestVoteMethod;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class ContestCreateRequest {

    @NotNull
    private UUID electionId;

    @NotBlank
    private String contestName;

    private ContestCategory category = ContestCategory.OTHER;

    private ContestScopeType scopeType = ContestScopeType.NATIONAL;
    private UUID countyId;
    private UUID districtId;

    private ContestVoteMethod voteMethod = ContestVoteMethod.SINGLE_CHOICE;

    @Min(1)
    private Integer seats = 1;

    @Min(1)
    private Integer maxSelections = 1;

    private String description;

    private ContestStatus status = ContestStatus.DRAFT;

    private Boolean isActive = true;
}
