package election.ems_backend.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrgMembershipDto {

    private UUID membershipId;
    private UUID orgId;
    private String orgName;
    private UUID userId;
    private String roleName;   // e.g., ADMIN, PARTY_ADMIN, ...
    private boolean enabled;
    private LocalDateTime dateCreated;

    // ✅ add these (for best UX)
    private String firstName;
    private String lastName;
    private String fullName;
    private String userName;
    private String email;
}
