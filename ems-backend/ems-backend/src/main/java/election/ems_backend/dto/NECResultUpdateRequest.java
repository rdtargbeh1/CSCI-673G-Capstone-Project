package election.ems_backend.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.Map;
import java.util.UUID;

@Getter
@Setter
public class NECResultUpdateRequest {
    private Map<UUID, Integer> candidateVotes; // null => no change
    private Integer totalRegisteredVoters;
    private Integer ballotsCast;
    private Integer invalidBallots;
    private Integer unmarkedBallots;
    private Integer unusedBallots;
    private Integer rejectedBallots;
    private Integer spoiledBallots;
    private String source;
}
