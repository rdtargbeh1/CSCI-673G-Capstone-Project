package election.ems_backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class VoteSubmissionContestCreateRequest {

    @NotNull
    private UUID submissionId;

    @NotNull
    private UUID orgId;

    @NotNull
    private UUID electionId;

    @NotNull
    private UUID contestId;

    @NotNull
    private UUID optionId;

    @Min(0)
    private Integer voteValue = 0;

    // for ranked contests only; must be null for non-ranked
    private Integer rank;
}