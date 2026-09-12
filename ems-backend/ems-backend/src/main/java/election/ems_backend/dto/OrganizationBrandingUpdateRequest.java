package election.ems_backend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrganizationBrandingUpdateRequest {

    private String logoUrl;
    private String primaryColor;
    private String subdomain;

}