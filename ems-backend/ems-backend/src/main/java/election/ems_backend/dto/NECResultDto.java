package election.ems_backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class NECResultDto {
    private UUID resultId;

    private UUID electionId;
    private String electionName;

    private UUID centerId;
    private String pollingCenterName;

    // Candidate -> votes; serialized to jsonb in the entity
    private Map<String, Integer> candidateVotes;

    private Integer totalRegisteredVoters;
    private Integer ballotsCast;
    private Integer invalidBallots;
    private Integer unmarkedBallots;
    private Integer unusedBallots;
    private Integer rejectedBallots;
    private Integer spoiledBallots;

    private String source;
    private LocalDateTime uploadTime;
}