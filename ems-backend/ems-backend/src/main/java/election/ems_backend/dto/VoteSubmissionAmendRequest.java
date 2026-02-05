package election.ems_backend.dto;

import lombok.Data;

import java.util.Map;
import java.util.UUID;

@Data
public class VoteSubmissionAmendRequest {
    private UUID actorUserId;          // NEC admin
    private String reason;             // required
    private Map<String,Integer> candidateVotes;
    private Integer ballotsInBox;
    private Integer invalidBallots;
    private Integer unmarkedBallots;
    private Integer rejectedBallots;
    private Integer spoiledBallots;
    private Integer unusedBallots;
}

