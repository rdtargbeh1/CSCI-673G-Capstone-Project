package election.ems_backend.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
public class VoteSubmissionReopenRequest {

    private UUID actorUserId;

    private String reason;

    private String typedSignature;

    private String certificationStatement;

    private Boolean certificationConfirmed;
}