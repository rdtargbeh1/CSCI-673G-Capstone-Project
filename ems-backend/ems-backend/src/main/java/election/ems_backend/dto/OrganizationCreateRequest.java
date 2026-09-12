package election.ems_backend.dto;

import election.ems_backend.enums.OrganizationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@Builder
public class OrganizationCreateRequest {

    @NotBlank
    @Size(max = 120)
    private String orgName;

    @NotNull
    private OrganizationType organizationType;

    @Size(max = 63)
    private String subdomain; // optional but must be unique if provided

    @Size(max = 2048)
    private String logoUrl;

    @Size(max = 9)
    private String primaryColor;

    private Boolean isActive;

    private UUID partyId;

}
