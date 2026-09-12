package election.ems_backend.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
public class ChatRoomUpdateRequest {
    private String name;
    private String description;
    private Boolean isArchived;
    private Map<String, Object> settings;
}
