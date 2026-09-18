package election.ems_backend.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Data
public class NecResultStagingDto {
    private UUID stagingId;
    private UUID batchId;
    private UUID electionId;
    private String centerCode;
    private UUID assignedCenterId;
    private Map<String, Integer> candidateVotes;
    private Integer totalRegisteredVoters;
    private Integer ballotsCast;
    private Integer invalidBallots;
    private Integer unmarkedBallots;
    private Integer unusedBallots;
    private Integer rejectedBallots;
    private Integer spoiledBallots;
    private String source;
    private UUID uploadedBy;
    private LocalDateTime uploadTime;
    private Boolean validated;
    private String validationErrors;
    private UUID validatedBy;
    private LocalDateTime validatedAt;
    private Boolean isPublished;
    private UUID publishedBy;
    private LocalDateTime publishedAt;
    private Boolean processed;
    private LocalDateTime processedAt;
    private UUID processedResultId; // link to authoritative NECResult
}