package election.ems_backend.dto;

import election.ems_backend.enums.RoleName;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRoleDto {
    private UUID roleId;
    private RoleName roleName;
    private String description;
}