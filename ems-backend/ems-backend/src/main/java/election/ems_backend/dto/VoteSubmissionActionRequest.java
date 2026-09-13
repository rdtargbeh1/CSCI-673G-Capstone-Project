package election.ems_backend.dto;

import election.ems_backend.enums.VoteSubmissionActionType;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
public class VoteSubmissionActionRequest {

    private UUID actorUserId;

    private VoteSubmissionActionType actionType;

    private String statusBefore;

    private String statusAfter;

    private String reason;

    private String comments;

    private String typedSignature;

    private String certificationStatement;

    private Boolean certificationConfirmed;

    private Map<String, Object> actionData;
}