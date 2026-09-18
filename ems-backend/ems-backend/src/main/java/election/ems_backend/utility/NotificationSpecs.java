package election.ems_backend.utility;

import election.ems_backend.entity.Notification;
import election.ems_backend.enums.DeliveryMethod;
import election.ems_backend.enums.NotificationType;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public class NotificationSpecs {

    public static Specification<Notification> orgEquals(UUID orgId) {
        return (root, q, cb) -> orgId == null ? cb.conjunction()
                : cb.equal(root.get("organization").get("orgId"), orgId);
    }
    public static Specification<Notification> userEquals(UUID userId) {
        return (root, q, cb) -> userId == null ? cb.conjunction()
                : cb.equal(root.get("user").get("userId"), userId);
    }
    public static Specification<Notification> typeEquals(NotificationType type) {
        return (root, q, cb) -> type == null ? cb.conjunction()
                : cb.equal(root.get("type"), type);
    }
    public static Specification<Notification> methodEquals(DeliveryMethod method) {
        return (root, q, cb) -> method == null ? cb.conjunction()
                : cb.equal(root.get("deliveryMethod"), method);
    }
    public static Specification<Notification> unread(Boolean unread) {
        return (root, q, cb) -> unread == null ? cb.conjunction()
                : (unread ? cb.isFalse(root.get("isRead")) : cb.conjunction());
    }
}
