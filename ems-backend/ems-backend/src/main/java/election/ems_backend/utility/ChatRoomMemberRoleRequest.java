package election.ems_backend.utility;

import election.ems_backend.enums.ChatMemberRole;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChatRoomMemberRoleRequest {
    @NotNull
    private ChatMemberRole roleName;
}
