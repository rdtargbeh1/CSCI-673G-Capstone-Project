package election.ems_backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ChatReactionDto {
    private UUID reactionId;
    private UUID messageId;
    private UUID userId;
    private String userName;       // convenience for UI
    private String emoji;
    private LocalDateTime dateCreated;
}
