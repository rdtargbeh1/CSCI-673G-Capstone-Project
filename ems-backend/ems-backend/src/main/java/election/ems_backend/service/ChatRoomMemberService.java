package election.ems_backend.service;

import election.ems_backend.dto.ChatMessageCreateRequest;
import election.ems_backend.dto.ChatMessageDto;
import election.ems_backend.dto.ChatRoomMemberAddRequest;
import election.ems_backend.dto.ChatRoomMemberDto;
import election.ems_backend.utility.ChatRoomMemberMuteRequest;
import election.ems_backend.utility.ChatRoomMemberRoleRequest;
import election.ems_backend.utility.ChatRoomMemberSeenRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ChatRoomMemberService {
    Page<ChatRoomMemberDto> listInTenant(UUID roomId, Pageable pageable);
    ChatRoomMemberDto addInTenant(UUID roomId, ChatRoomMemberAddRequest req);
    void removeInTenant(UUID roomId, UUID userId);
    ChatRoomMemberDto setRoleInTenant(UUID roomId, UUID userId, ChatRoomMemberRoleRequest req);
    ChatRoomMemberDto setMutedInTenant(UUID roomId, UUID userId, ChatRoomMemberMuteRequest req);
    void markSeenInTenant(UUID roomId, UUID userId, ChatRoomMemberSeenRequest req);

    long unreadCountInTenant(UUID roomId, UUID userId);

    ChatMessageDto sendInTenant(ChatMessageCreateRequest req);
}
