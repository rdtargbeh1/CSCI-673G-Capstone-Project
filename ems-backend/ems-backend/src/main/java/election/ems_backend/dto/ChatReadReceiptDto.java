package election.ems_backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ChatReadReceiptDto {
    private UUID messageId;
    private UUID userId;
    private String userName;        // convenience
    private LocalDateTime dateRead;
}
