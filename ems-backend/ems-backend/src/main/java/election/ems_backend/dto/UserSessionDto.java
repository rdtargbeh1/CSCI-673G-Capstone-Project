package election.ems_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSessionDto {
    private UUID sessionId;
    private UUID userId;
    private UUID orgId;
    private LocalDateTime dateCreated;
    private LocalDateTime expiresDate;
    private boolean revoked;
}