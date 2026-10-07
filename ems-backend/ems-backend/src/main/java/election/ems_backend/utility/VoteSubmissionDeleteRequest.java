package election.ems_backend.utility;


import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class VoteSubmissionDeleteRequest {

    @NotBlank(message = "reason is required")
    @Size(max = 500, message = "reason must be <= 500 chars")
    private String reason;

    @NotNull(message = "deletedByUserId is required")
    private UUID deletedByUserId;

}
