package election.ems_backend.mapper;

import election.ems_backend.dto.NotificationDto;
import election.ems_backend.entity.Notification;
import org.springframework.stereotype.Component;

@Component
public class NotificationMapper {

    public NotificationDto toDTO(Notification n) {
        return NotificationDto.builder()
                .notificationId(n.getNotificationId())
                .orgId(n.getOrganization().getOrgId())
                .userId(n.getUser().getUserId())
                .type(n.getType())
                .title(n.getTitle())
                .message(n.getMessage())
                .relatedTable(n.getRelatedTable())
                .relatedId(n.getRelatedId())
                .isRead(n.isRead())
                .isSeen(n.isSeen())
                .dateCreated(n.getDateCreated())
                .dateRead(n.getDateRead())
                .dateExpires(n.getDateExpires())
                .priority(n.getPriority())
                .deliveryMethod(n.getDeliveryMethod())
                .createdBy(n.getCreatedBy() != null ? n.getCreatedBy().getUserId() : null)
                .idempotencyKey(n.getIdempotencyKey())
                .build();
    }

}
