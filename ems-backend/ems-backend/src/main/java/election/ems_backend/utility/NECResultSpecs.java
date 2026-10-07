package election.ems_backend.utility;

import election.ems_backend.entity.NECResult;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.UUID;

public final class NECResultSpecs {
    private NECResultSpecs() {}

    public static Specification<NECResult> electionEquals(UUID electionId) {
        return (root, cq, cb) ->
                electionId == null ? cb.conjunction() :
                        cb.equal(root.get("election").get("electionId"), electionId);
    }

    public static Specification<NECResult> centerEquals(UUID centerId) {
        return (root, cq, cb) ->
                centerId == null ? cb.conjunction() :
                        cb.equal(root.get("pollingCenter").get("pollingCenterId"), centerId);
    }

    public static Specification<NECResult> uploadedAfter(LocalDateTime after) {
        return (root, cq, cb) ->
                after == null ? cb.conjunction() :
                        cb.greaterThanOrEqualTo(root.get("uploadTime"), after);
    }

    public static Specification<NECResult> uploadedBefore(LocalDateTime before) {
        return (root, cq, cb) ->
                before == null ? cb.conjunction() :
                        cb.lessThanOrEqualTo(root.get("uploadTime"), before);
    }
}