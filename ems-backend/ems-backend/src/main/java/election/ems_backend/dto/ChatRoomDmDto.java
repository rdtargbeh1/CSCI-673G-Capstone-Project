package election.ems_backend.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class ChatRoomDmDto {
    private UUID roomId;
    private UUID orgId;

    private UUID user1Id;
    private String user1Name;

    private UUID user2Id;
    private String user2Name;
}