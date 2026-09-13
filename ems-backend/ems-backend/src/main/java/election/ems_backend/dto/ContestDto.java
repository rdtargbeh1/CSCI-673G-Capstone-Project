package election.ems_backend.dto;

import election.ems_backend.enums.ContestCategory;
import election.ems_backend.enums.ContestScopeType;
import election.ems_backend.enums.ContestStatus;
import election.ems_backend.enums.ContestVoteMethod;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for Contest entity used by API and services.
 */
@Data
public class ContestDto {
    private UUID contestId;

    private UUID electionId;
    private String contestName;

    private ContestCategory category;
    private ContestScopeType scopeType;
    private UUID countyId;
    private UUID districtId;

    private ContestVoteMethod voteMethod;
    private Integer seats;
    private Integer maxSelections;

    private String description;

    private ContestStatus status;
    private Boolean isActive;

    private LocalDateTime dateCreated;
    private LocalDateTime dateUpdated;
}