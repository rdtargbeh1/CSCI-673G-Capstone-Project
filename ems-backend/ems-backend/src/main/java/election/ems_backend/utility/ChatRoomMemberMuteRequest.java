package election.ems_backend.utility;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChatRoomMemberMuteRequest {
    @NotNull
    private Boolean muted;
}