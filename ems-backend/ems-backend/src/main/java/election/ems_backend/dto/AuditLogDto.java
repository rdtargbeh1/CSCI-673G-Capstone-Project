package election.ems_backend.dto;

import election.ems_backend.enums.ActivityType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class AuditLogDto {
    private UUID logId;
    private UUID orgId;
    private String orgName;
    private UUID userId;
    private String userName;
    private ActivityType activityType;
    private String entityAffected;
    private String actionDescription;
    private LocalDateTime dateCreated;
    private String metadata;

}