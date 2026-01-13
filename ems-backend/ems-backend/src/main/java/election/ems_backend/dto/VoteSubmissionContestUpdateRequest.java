package election.ems_backend.dto;


import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VoteSubmissionContestUpdateRequest {

    @Min(0)
    private Integer voteValue;

    // ranked contests only; must be null for non-ranked
    private Integer rank;
}
