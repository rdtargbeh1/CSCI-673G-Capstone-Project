package election.ems_backend.utility;

import election.ems_backend.entity.ObserverReport;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.UUID;

public final class ObserverReportSpecs {
    private ObserverReportSpecs(){}

    public static Specification<ObserverReport> orgEquals(UUID orgId) {
        return (root,cq,cb) -> orgId == null ? cb.conjunction()
                : cb.equal(root.get("organization").get("orgId"), orgId);
    }
    public static Specification<ObserverReport> observerEquals(UUID observerId) {
        return (root,cq,cb) -> observerId == null ? cb.conjunction()
                : cb.equal(root.get("observer").get("userId"), observerId);
    }
    public static Specification<ObserverReport> countyEquals(UUID countyId) {
        return (root,cq,cb) -> countyId == null ? cb.conjunction()
                : cb.equal(root.get("county").get("countyId"), countyId);
    }
    public static Specification<ObserverReport> centerEquals(UUID centerId) {
        return (root,cq,cb) -> centerId == null ? cb.conjunction()
                : cb.equal(root.get("pollingCenter").get("pollingCenterId"), centerId);
    }
    public static Specification<ObserverReport> typeEquals(String type) {
        return (root,cq,cb) -> (type == null || type.isBlank()) ? cb.conjunction()
                : cb.equal(root.get("type"), Enum.valueOf(election.ems_backend.enums.ReportType.class, type));
    }
    public static Specification<ObserverReport> resolvedEquals(Boolean resolved) {
        return (root,cq,cb) -> resolved == null ? cb.conjunction()
                : cb.equal(root.get("resolved"), resolved);
    }
    public static Specification<ObserverReport> between(LocalDateTime from, LocalDateTime to) {
        return (root,cq,cb) -> {
            if (from == null && to == null) return cb.conjunction();
            if (from != null && to != null) return cb.between(root.get("timestamp"), from, to);
            return from != null ? cb.greaterThanOrEqualTo(root.get("timestamp"), from)
                    : cb.lessThanOrEqualTo(root.get("timestamp"), to);
        };
    }
    public static Specification<ObserverReport> textSearch(String q) {
        return (root,cq,cb) -> {
            if (q == null || q.isBlank()) return cb.conjunction();
            String like = "%" + q.toLowerCase() + "%";
            return cb.like(cb.lower(root.get("description")), like);
        };
    }
}