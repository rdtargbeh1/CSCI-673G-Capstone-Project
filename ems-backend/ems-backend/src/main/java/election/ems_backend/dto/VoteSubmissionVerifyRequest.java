package election.ems_backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class VoteSubmissionVerifyRequest {

    @NotNull
    private UUID verifierUserId;

    @NotNull
    private Boolean accept; // true = VERIFY, false = REJECT

    private String comment; // optional note

    // Typed certification signature
    private String typedSignature;

    // Certification statement shown to the reviewer
    private String certificationStatement;

    // Reviewer explicitly confirmed certification
    private Boolean certificationConfirmed;
}