package election.ems_backend.dto;

import election.ems_backend.enums.ChangeType;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * DTO used to expose history entries for NEC results.
 */
@Data
public class NecResultHistoryDto {
    private UUID historyId;
    private UUID resultId;
    private UUID electionId;
    private UUID contestId;
    private UUID centerId;
    private Map<String, Integer> candidateVotes;
    private Integer totalRegisteredVoters;
    private Integer ballotsCast;
    private Integer invalidBallots;
    private Integer unmarkedBallots;
    private Integer unusedBallots;
    private Integer rejectedBallots;
    private Integer spoiledBallots;
    private ChangeType changeType;
    private UUID changedBy;
    private String changedByUserName;
    private LocalDateTime dateChanged;
    private String notes;
    private String userNote;
}