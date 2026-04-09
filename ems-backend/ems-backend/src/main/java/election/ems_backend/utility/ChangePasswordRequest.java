package election.ems_backend.utility;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class ChangePasswordRequest {

    @NotBlank
    private String currentPassword;

    @NotBlank @Size(min = 8, max = 200)
    private String newPassword;
}
