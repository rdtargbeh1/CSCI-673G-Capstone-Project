package election.ems_backend.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class UserSessionCreateRequest {
    private UUID userId;
    private UUID orgId;
    private LocalDateTime expiresDate;
}
