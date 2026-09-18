package election.ems_backend.dto;

import election.ems_backend.enums.DeliveryMethod;
import election.ems_backend.enums.NotificationPriority;
import election.ems_backend.enums.NotificationType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class NotificationDto {
    private UUID notificationId;
    private UUID orgId;
    private UUID userId;
    private NotificationType type;
    private String title;
    private String message;
    private String relatedTable;
    private UUID relatedId;
    private boolean isRead;
    private boolean isSeen;
    private LocalDateTime dateCreated;
    private LocalDateTime dateRead;
    private LocalDateTime dateExpires;
    private NotificationPriority priority;
    private DeliveryMethod deliveryMethod;
    private UUID createdBy;
    private String idempotencyKey;
}
