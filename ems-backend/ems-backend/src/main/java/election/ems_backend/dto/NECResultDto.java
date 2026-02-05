package election.ems_backend.dto;

import election.ems_backend.entity.Contest;
import jakarta.persistence.Column;
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

    private UUID contest;
    private String contestName;

    private UUID centerId;
    private String pollingCenterName;

    // Candidate -> votes; serialized to jsonb in the entity
    private Map<String, Integer> candidateVotes;

    private Integer totalRegisteredVoters;
    private Integer ballotsInBox;
    private Integer invalidBallots;
    private Integer unmarkedBallots;
    private Integer unusedBallots;
    private Integer rejectedBallots;
    private Integer spoiledBallots;

    private String source;
    private LocalDateTime uploadTime;

    private String resultSignature;
    private UUID resultSignerKeyId;
    private String chainHash;

}