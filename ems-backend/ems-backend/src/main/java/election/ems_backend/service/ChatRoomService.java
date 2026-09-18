package election.ems_backend.service;

import election.ems_backend.dto.ChatRoomCreateRequest;
import election.ems_backend.dto.ChatRoomDto;
import election.ems_backend.dto.ChatRoomUpdateRequest;
import election.ems_backend.entity.Organization;
import election.ems_backend.entity.SystemUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ChatRoomService {

    ChatRoomDto create(Organization org, SystemUser creator, ChatRoomCreateRequest req);

    ChatRoomDto get(Organization org, UUID roomId);

    Page<ChatRoomDto> search(Organization org, String q, boolean includeArchived, Pageable pageable);

    ChatRoomDto update(Organization org, UUID roomId, ChatRoomUpdateRequest req);

    void archive(Organization org, UUID roomId, boolean archived);
}