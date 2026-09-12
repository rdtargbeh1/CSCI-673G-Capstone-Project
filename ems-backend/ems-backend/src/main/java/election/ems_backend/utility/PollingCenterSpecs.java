package election.ems_backend.utility;

import election.ems_backend.entity.PollingCenter;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public final class PollingCenterSpecs {
    private PollingCenterSpecs() {}

    public static Specification<PollingCenter> textContains(String q) {
        return (root, cq, cb) -> {
            if (q == null || q.isBlank()) return cb.conjunction();
            String like = "%" + q.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("centerName")), like),
                    cb.like(cb.lower(root.get("code")), like)
            );
        };
    }

    public static Specification<PollingCenter> districtEquals(UUID districtId) {
        return (root, cq, cb) ->
                districtId == null ? cb.conjunction() :
                        cb.equal(root.get("district").get("districtId"), districtId);
    }

    public static Specification<PollingCenter> countyEquals(UUID countyId) {
        return (root, cq, cb) ->
                countyId == null ? cb.conjunction() :
                        cb.equal(root.get("district").get("county").get("countyId"), countyId);
    }
}