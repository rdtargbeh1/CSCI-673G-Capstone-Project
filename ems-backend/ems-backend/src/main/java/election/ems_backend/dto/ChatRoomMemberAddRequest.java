package election.ems_backend.dto;

import election.ems_backend.enums.ChatMemberRole;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class ChatRoomMemberAddRequest {
    @NotNull
    private UUID userId;
    @NotNull private ChatMemberRole roleName; // MEMBER/ADMIN
}
