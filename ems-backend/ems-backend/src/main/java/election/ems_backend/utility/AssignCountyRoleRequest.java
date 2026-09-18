package election.ems_backend.utility;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class AssignCountyRoleRequest {
    private UUID countyId;
    private String roleName;
}
