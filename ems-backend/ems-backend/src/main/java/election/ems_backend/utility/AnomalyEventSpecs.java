package election.ems_backend.utility;


import election.ems_backend.entity.AnomalyEvent;
import election.ems_backend.enums.AnomalyKind;
import jakarta.persistence.criteria.Expression;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.UUID;

public class AnomalyEventSpecs {

    public static Specification<AnomalyEvent> orgEquals(UUID orgId) {
        return (root, q, cb) -> orgId == null ? cb.conjunction()
                : cb.equal(root.get("organization").get("orgId"), orgId);
    }

    public static Specification<AnomalyEvent> electionEquals(UUID electionId) {
        return (root, q, cb) -> electionId == null ? cb.conjunction()
                : cb.equal(root.get("election").get("electionId"), electionId);
    }

    public static Specification<AnomalyEvent> centerEquals(UUID centerId) {
        return (root, q, cb) -> centerId == null ? cb.conjunction()
                : cb.equal(root.get("pollingCenter").get("centerId"), centerId);
    }

    public static Specification<AnomalyEvent> kindEquals(AnomalyKind kind) {
        return (root, q, cb) -> kind == null ? cb.conjunction()
                : cb.equal(root.get("kind"), kind);
    }

    public static Specification<AnomalyEvent> between(LocalDateTime from, LocalDateTime to) {
        return (root, q, cb) -> {
            if (from == null && to == null) return cb.conjunction();
            if (from != null && to != null) return cb.between(root.get("dateCreated"), from, to);
            return from != null ? cb.greaterThanOrEqualTo(root.get("dateCreated"), from)
                    : cb.lessThan(root.get("dateCreated"), to);
        };
    }

    // Simple JSONB text search (works on Postgres via cast to string)
    public static Specification<AnomalyEvent> textSearch(String qStr) {
        return (root, q, cb) -> {
            if (qStr == null || qStr.isBlank()) return cb.conjunction();
            Expression<String> detailsAsText = root.get("details").as(String.class);
            return cb.like(cb.lower(detailsAsText), "%" + qStr.toLowerCase() + "%");
        };
    }
}

