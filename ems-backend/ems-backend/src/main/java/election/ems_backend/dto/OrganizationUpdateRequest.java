package election.ems_backend.dto;

import election.ems_backend.enums.OrganizationType;
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
public class OrganizationUpdateRequest {
    @Size(max = 100)
    private String orgName;

    private OrganizationType organizationType;

    private UUID partyId; // nullable: set to null to clear

    @Size(max = 63)
    private String subdomain; // nullable

    @Size(max = 2048)
    private String logoUrl;

    @Size(max = 9)
    private String primaryColor;

    private Boolean active;
}
