package election.ems_backend.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class NECOverallTotalsDto {
    private long totalCandidateVotes;
    private long ballotsCast;
    private long invalidBallots;
    private long blankBallots;
    private long rejectedBallots;
    private long spoiledBallots;
}