package election.ems_backend.utility;

import election.ems_backend.entity.PollingCenterAllocation;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public final class PollingCenterAllocationSpecs {
    private PollingCenterAllocationSpecs() {}

    public static Specification<PollingCenterAllocation> electionEquals(UUID electionId) {
        return (root, cq, cb) -> electionId == null ? cb.conjunction()
                : cb.equal(root.get("election").get("electionId"), electionId);
    }
    public static Specification<PollingCenterAllocation> centerEquals(UUID centerId) {
        return (root, cq, cb) -> centerId == null ? cb.conjunction()
                : cb.equal(root.get("pollingCenter").get("pollingCenterId"), centerId);
    }
    public static Specification<PollingCenterAllocation> countyEquals(UUID countyId) {
        return (root, cq, cb) -> countyId == null ? cb.conjunction()
                : cb.equal(root.get("pollingCenter").get("district").get("county").get("countyId"), countyId);
    }
    public static Specification<PollingCenterAllocation> districtEquals(UUID districtId) {
        return (root, cq, cb) -> districtId == null ? cb.conjunction()
                : cb.equal(root.get("pollingCenter").get("district").get("districtId"), districtId);
    }
}