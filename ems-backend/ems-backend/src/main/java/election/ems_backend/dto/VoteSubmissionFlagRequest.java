package election.ems_backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class VoteSubmissionFlagRequest {

    @NotNull
    private UUID actorUserId;

    @NotNull
    private Boolean flagged;

    // Required when flagging.
    // Can also be used as the resolution explanation when unflagging.
    private String comments;

    // Typed certification signature
    private String typedSignature;

    // Statement shown to the user during certification
    private String certificationStatement;

    // Explicit certification checkbox/confirmation
    private Boolean certificationConfirmed;
}