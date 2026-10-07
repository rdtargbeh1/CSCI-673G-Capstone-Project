package election.ems_backend.dto;

import election.ems_backend.enums.VoteSubmissionActionType;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
public class VoteSubmissionActionDto {

    // ========================================================================
    // ACTION
    // ========================================================================

    private UUID actionId;

    private VoteSubmissionActionType actionType;

    private String statusBefore;

    private String statusAfter;

    private LocalDateTime actionTime;

    private LocalDateTime dateCreated;
    private UUID submissionId;
    private UUID orgId;

    private UUID electionId;
    private String electionName;

    private UUID contestId;
    private String contestName;

    private UUID countyId;
    private String countyName;

    private UUID districtId;
    private String districtName;

    private UUID centerId;
    private String centerName;
    private String centerCode;

    private UUID placeId;
    private String placeCode;
    private Integer placeNumber;
    private String placeLabel;

    private UUID actorUserId;
    private String actorName;

    private String reason;
    private String comments;

    private String typedSignature;
    private String certificationStatement;
    private boolean certificationConfirmed;

    private String clientIp;
    private String userAgent;

    private Map<String, Object> actionData;
}