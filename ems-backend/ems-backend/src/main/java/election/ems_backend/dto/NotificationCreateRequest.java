package election.ems_backend.dto;

import election.ems_backend.enums.DeliveryMethod;
import election.ems_backend.enums.NotificationPriority;
import election.ems_backend.enums.NotificationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Getter
@Setter

@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationCreateRequest {
    @NotNull
    private UUID orgId;
    @NotNull
    private UUID userId;
    @NotNull
    private NotificationType type;
    @NotBlank
    private String title;
    private String message;
    private String relatedTable;
    private UUID relatedId;
    private NotificationPriority priority = NotificationPriority.NORMAL;
    private DeliveryMethod deliveryMethod = DeliveryMethod.IN_APP;
    private Set<DeliveryMethod> channels;
    private LocalDateTime dateExpires;
    private UUID createdBy;
    private String idempotencyKey;
}
