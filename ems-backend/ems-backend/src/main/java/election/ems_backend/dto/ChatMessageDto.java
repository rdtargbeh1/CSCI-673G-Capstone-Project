package election.ems_backend.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageDto {
    private UUID messageId;
    private UUID roomId;
    private UUID senderId;
    private String senderName;
    private String contentType; // TEXT | IMAGE | FILE | SYSTEM
    private String content;
    private Map<String,Object> metadata;
    private UUID replyTo;
    private LocalDateTime dateCreated;
    private LocalDateTime dateEdited;
}