package election.ems_backend.service;

import election.ems_backend.dto.ChatRoomDmDto;

import java.util.List;
import java.util.UUID;

public interface ChatRoomDmService {
    ChatRoomDmDto openOrGet(UUID otherUserId);
    List<ChatRoomDmDto> myDms();
}
