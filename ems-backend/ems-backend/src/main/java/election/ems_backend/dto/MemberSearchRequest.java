package election.ems_backend.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Builder
public class MemberSearchRequest {

    private String q;          // optional: search by userName/first/last/email (basic)
    private String roleName;   // optional
    private Boolean enabled;

    public MemberSearchRequest(String q, String roleName, Boolean enabled) {
        this.q = q;
        this.roleName = roleName;
        this.enabled = enabled;
    }
}
