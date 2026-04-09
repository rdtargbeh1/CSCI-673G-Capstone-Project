package election.ems_backend.utility;


import java.time.LocalDateTime;
import java.util.UUID;

import election.ems_backend.entity.AuditLog;
import election.ems_backend.enums.ActivityType;
import org.springframework.data.jpa.domain.Specification;

public class AuditLogSpecs {
    public static Specification<AuditLog> orgEquals(UUID orgId) {
        return (root, q, cb) -> orgId == null ? cb.conjunction()
                : cb.equal(root.get("organization").get("orgId"), orgId);
    }

    public static Specification<AuditLog> userEquals(UUID userId) {
        return (root, q, cb) -> userId == null ? cb.conjunction()
                : cb.equal(root.get("user").get("userId"), userId);
    }

    public static Specification<AuditLog> typeEquals(ActivityType type) {
        return (root, q, cb) -> type == null ? cb.conjunction()
                : cb.equal(root.get("activityType"), type);
    }

    public static Specification<AuditLog> between(LocalDateTime from, LocalDateTime to) {
        return (root, q, cb) -> {
            if (from == null && to == null) return cb.conjunction();
            if (from != null && to != null) return cb.between(root.get("timestamp"), from, to);
            if (from != null) return cb.greaterThanOrEqualTo(root.get("timestamp"), from);
            return cb.lessThanOrEqualTo(root.get("timestamp"), to);
        };
    }

    public static Specification<AuditLog> textSearch(String q) {
        return (root, query, cb) -> {
            if (q == null || q.isBlank()) return cb.conjunction();
            String like = "%" + q.toLowerCase() + "%";
            return cb.like(cb.lower(root.get("actionDescription")), like);
        };
    }
}
