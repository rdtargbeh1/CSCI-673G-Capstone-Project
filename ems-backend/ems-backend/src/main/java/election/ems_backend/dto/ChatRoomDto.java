package election.ems_backend.dto;

import election.ems_backend.enums.RoomType;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatRoomDto {

    private UUID roomId;
    private String name;
    private String description;
    private RoomType roomType;
    private boolean isArchived;
    private UUID orgId;
    private String orgName;
    private UUID createdById;
    private String createdByFullName;
    private LocalDateTime dateCreated;
    private Map<String, Object> settings;
}