package election.ems_backend.dto;

import election.ems_backend.enums.RoleName;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserCreateRequest {

    @NotBlank
    @Size(max = 30)
    private String firstName;

    @NotBlank @Size(max = 30)
    private String lastName;

    @NotBlank @Size(max = 30)
    private String userName;

    @Size(max = 50)
    private String position;

    @NotBlank @Email
    @Size(min = 3, max = 30)
    private String email;

    @Size(max = 20)
    private String phoneNumber;

    @NotBlank @Size(min = 8, max = 200)
    private String password;

    @Size(max = 2048)
    private String profileImageUrl;
    private UUID profileImageUploadId;

    @NotNull
    private RoleName roleName;
    private UUID partyId;                    // optional
    private UUID assignedCountyId;           // optional
    private UUID defaultOrgId;

}
