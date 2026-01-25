package election.ems_backend.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
public class VoteSubmissionUpdateRequest {
    private Map<String,Integer> candidateVotes;
    private Integer ballotsInBox;
    private Integer invalidBallots;
    private Integer unmarkedBallots;
    private Integer rejectedBallots;
    private Integer spoiledBallots;
    private Integer unusedBallots;
    private String comments;
    private Double latitude;
    private Double longitude;
}
