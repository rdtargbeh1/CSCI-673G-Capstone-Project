package election.ems_backend.utility;

import election.ems_backend.entity.*;
import election.ems_backend.enums.DiscrepancyReconciliationPhase;
import election.ems_backend.enums.DiscrepancySeverity;
import election.ems_backend.enums.DiscrepancyStatus;
import election.ems_backend.enums.DiscrepancyType;
import jakarta.persistence.criteria.Join;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.UUID;

public class DiscrepancySpecs {

    public static Specification<Discrepancy> electionEquals(UUID electionId) {
        return (root, q, cb) -> electionId == null ? cb.conjunction()
                : cb.equal(root.get("election").get("electionId"), electionId);
    }

    public static Specification<Discrepancy> centerEquals(UUID centerId) {
        return (root, q, cb) -> centerId == null ? cb.conjunction()
                : cb.equal(root.get("pollingCenter").get("centerId"), centerId);
    }

    public static Specification<Discrepancy> placeEquals(UUID placeId) {
        return (root, q, cb) -> placeId == null ? cb.conjunction()
                : cb.equal(root.get("pollingPlace").get("placeId"), placeId);
    }

    public static Specification<Discrepancy> districtEquals(UUID districtId) {
        return (root, q, cb) -> {
            if (districtId == null) return cb.conjunction();
            Join<Discrepancy, PollingCenter> pc = root.join("pollingCenter");
            Join<PollingCenter, District> d = pc.join("district");
            return cb.equal(d.get("districtId"), districtId);
        };
    }

    public static Specification<Discrepancy> countyEquals(UUID countyId) {
        return (root, q, cb) -> {
            if (countyId == null) return cb.conjunction();
            Join<Discrepancy, PollingCenter> pc = root.join("pollingCenter");
            Join<PollingCenter, District> d = pc.join("district");
            Join<District, County> c = d.join("county");
            return cb.equal(c.get("countyId"), countyId);
        };
    }

    public static Specification<Discrepancy> typeEquals(DiscrepancyType type) {
        return (root, q, cb) -> type == null ? cb.conjunction()
                : cb.equal(root.get("discrepancyType"), type);
    }

    public static Specification<Discrepancy> phaseEquals(DiscrepancyReconciliationPhase phase) {
        return (root, q, cb) -> phase == null ? cb.conjunction()
                : cb.equal(root.get("reconciliationPhase"), phase);
    }

    public static Specification<Discrepancy> severityEquals(DiscrepancySeverity severity) {
        return (root, q, cb) -> severity == null ? cb.conjunction()
                : cb.equal(root.get("severity"), severity);
    }

    public static Specification<Discrepancy> statusEquals(DiscrepancyStatus status) {
        return (root, q, cb) -> status == null ? cb.conjunction()
                : cb.equal(root.get("status"), status);
    }

    public static Specification<Discrepancy> createdAfter(LocalDateTime fromDate) {
        return (root, q, cb) -> fromDate == null ? cb.conjunction()
                : cb.greaterThanOrEqualTo(root.get("createdAt"), fromDate);
    }

    public static Specification<Discrepancy> createdBefore(LocalDateTime toDate) {
        return (root, q, cb) -> toDate == null ? cb.conjunction()
                : cb.lessThanOrEqualTo(root.get("createdAt"), toDate);
    }

}

