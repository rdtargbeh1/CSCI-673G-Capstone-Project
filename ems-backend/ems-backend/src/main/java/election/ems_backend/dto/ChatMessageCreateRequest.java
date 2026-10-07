package election.ems_backend.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.Map;
import java.util.UUID;

@Getter
@Setter
public class ChatMessageCreateRequest {
    private UUID roomId;
    private UUID clientGuid;              // idempotency
    private String contentType;           // defaults to TEXT
    private String content;
    private Map<String,Object> metadata;  // e.g., file keys
    private UUID replyTo;
}