package election.ems_backend.utility;

import election.ems_backend.entity.County;
import election.ems_backend.entity.Discrepancy;
import election.ems_backend.entity.District;
import election.ems_backend.entity.PollingCenter;
import election.ems_backend.enums.DiscrepancyStatus;
import jakarta.persistence.criteria.Join;
import org.springframework.data.jpa.domain.Specification;

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

    public static Specification<Discrepancy> statusEquals(DiscrepancyStatus status) {
        return (root, q, cb) -> status == null ? cb.conjunction() : cb.equal(root.get("status"), status);
    }
}

