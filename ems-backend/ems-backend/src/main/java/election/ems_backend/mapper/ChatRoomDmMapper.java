package election.ems_backend.mapper;

import election.ems_backend.dto.ChatRoomDmDto;
import election.ems_backend.entity.ChatRoomDm;

import java.util.Optional;

public class ChatRoomDmMapper {

    public ChatRoomDmDto toDTO(ChatRoomDm dm) {
        if (dm == null) return null;

        String u1fn = Optional.ofNullable(dm.getUser1().getFirstName()).orElse("");
        String u1ln = Optional.ofNullable(dm.getUser1().getLastName()).orElse("");
        String u2fn = Optional.ofNullable(dm.getUser2().getFirstName()).orElse("");
        String u2ln = Optional.ofNullable(dm.getUser2().getLastName()).orElse("");

        return ChatRoomDmDto.builder()
                .roomId(dm.getRoomId())
                .orgId(dm.getOrganization().getOrgId())
                .user1Id(dm.getUser1().getUserId())
                .user1Name((u1fn + " " + u1ln).trim())
                .user2Id(dm.getUser2().getUserId())
                .user2Name((u2fn + " " + u2ln).trim())
                .build();
    }
}
