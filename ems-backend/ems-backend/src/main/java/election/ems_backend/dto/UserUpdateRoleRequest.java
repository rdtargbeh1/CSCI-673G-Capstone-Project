package election.ems_backend.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserUpdateRoleRequest {

    /** We treat roleName as immutable; allow updating description only. */
    @Size(max = 250)
    private String description;
}
