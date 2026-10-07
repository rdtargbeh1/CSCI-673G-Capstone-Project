package election.ems_backend.utility;

import election.ems_backend.entity.PollingPlaceAllocation;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public final class PollingPlaceAllocationSpecs {

    private PollingPlaceAllocationSpecs() {
    }

    // ------------------------------------------------------------
    // Filter: electionId
    // ------------------------------------------------------------
    public static Specification<PollingPlaceAllocation> electionEquals(UUID electionId) {
        return (root, query, cb) -> {
            if (electionId == null) return cb.conjunction();
            return cb.equal(root.get("election").get("electionId"), electionId);
        };
    }

    // ------------------------------------------------------------
    // Filter: centerId
    // (PollingPlace → PollingCenter)
    // ------------------------------------------------------------
    public static Specification<PollingPlaceAllocation> centerEquals(UUID centerId) {
        return (root, query, cb) -> {
            if (centerId == null) return cb.conjunction();
            return cb.equal(
                    root.get("pollingPlace")
                            .get("pollingCenter")
                            .get("centerId"),
                    centerId
            );
        };
    }

    // ------------------------------------------------------------
    // Filter: placeId
    // ------------------------------------------------------------
    public static Specification<PollingPlaceAllocation> placeEquals(UUID placeId) {
        return (root, query, cb) -> {
            if (placeId == null) return cb.conjunction();
            return cb.equal(
                    root.get("pollingPlace").get("placeId"),
                    placeId
            );
        };
    }

}