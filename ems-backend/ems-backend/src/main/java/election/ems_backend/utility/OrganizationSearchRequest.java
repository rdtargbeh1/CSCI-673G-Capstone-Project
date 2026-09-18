package election.ems_backend.utility;

import election.ems_backend.enums.OrganizationType;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Builder
public class OrganizationSearchRequest {

    private String q;
    private Boolean active;
    private OrganizationType type;

    public OrganizationSearchRequest(String q, Boolean active, OrganizationType type) {
        this.q = q;
        this.active = active;
        this.type = type;
    }
}
