package election.ems_backend.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoomMemberDto {
    private UUID membershipId;
    private UUID roomId;
    private UUID userId;
    private String userName;       // first + last
    private String roleName;       // MEMBER / ADMIN
    private boolean muted;
    private boolean enabled;
    private LocalDateTime joinedAt;
    private LocalDateTime lastSeenAt;
    private UUID lastSeenMessageId;
}