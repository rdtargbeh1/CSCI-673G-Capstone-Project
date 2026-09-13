package election.ems_backend.mapper;

import election.ems_backend.dto.ChatRoomMemberCreateRequest;
import election.ems_backend.dto.ChatRoomMemberDto;
import election.ems_backend.entity.ChatMessage;
import election.ems_backend.entity.ChatRoom;
import election.ems_backend.entity.ChatRoomMember;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.enums.ChatMemberRole;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Optional;

@Component
public class ChatRoomMemberMapper {

    /** Convert entity → DTO */
    public ChatRoomMemberDto toDTO(ChatRoomMember m) {
        if (m == null) return null;

        String fn = Optional.ofNullable(m.getUser().getFirstName()).orElse("");
        String ln = Optional.ofNullable(m.getUser().getLastName()).orElse("");

        return ChatRoomMemberDto.builder()
                .membershipId(m.getMembershipId())
                .roomId(m.getRoom().getRoomId())
                .userId(m.getUser().getUserId())
                .userName((fn + " " + ln).trim())
                .roleName(m.getRoleName() != null ? m.getRoleName().name() : null)
                .muted(m.isMuted())
                .enabled(m.isEnabled())
                .joinedAt(m.getJoinedAt())
                .lastSeenAt(m.getLastSeenAt())
                .lastSeenMessageId(
                        m.getLastSeenMessage() != null ? m.getLastSeenMessage().getMessageId() : null
                )
                .build();
    }

    /** Convert request → entity (for adding a member) */
    public ChatRoomMember toEntity(ChatRoomMemberCreateRequest req, ChatRoom room, SystemUser user) {
        if (req == null) return null;

        ChatRoomMember m = new ChatRoomMember();
        m.setRoom(room);
        m.setUser(user);
        m.setRoleName(req.getRoleName() != null
                ? ChatMemberRole.valueOf(req.getRoleName().toUpperCase())
                : ChatMemberRole.MEMBER);
        m.setMuted(req.isMuted());
        m.setEnabled(true);
        m.setJoinedAt(LocalDateTime.now());
        return m;
    }

    /** Optional helper to apply updates (mute, role, etc.) */
    public void applyUpdates(ChatRoomMember m, ChatRoomMemberCreateRequest req, ChatMessage lastSeen) {
        if (req.getRoleName() != null) {
            m.setRoleName(ChatMemberRole.valueOf(req.getRoleName().toUpperCase()));
        }
        m.setMuted(req.isMuted());
        m.setEnabled(req.isEnabled());
        if (lastSeen != null) m.setLastSeenMessage(lastSeen);
        m.setLastSeenAt(LocalDateTime.now());
    }



}
