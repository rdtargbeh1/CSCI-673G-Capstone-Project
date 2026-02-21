
package election.ems_backend.views;

import election.ems_backend.views.entity.PlaceCoverageParty;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public class PlaceCoveragePartySpecs {

    public static Specification<PlaceCoverageParty> orgId(UUID orgId) {
        return (root, q, cb) -> orgId == null ? cb.conjunction() : cb.equal(root.get("id").get("orgId"), orgId);
    }

    public static Specification<PlaceCoverageParty> electionId(UUID electionId) {
        return (root, q, cb) -> electionId == null ? cb.conjunction() : cb.equal(root.get("id").get("electionId"), electionId);
    }

    public static Specification<PlaceCoverageParty> contestId(UUID contestId) {
        return (root, q, cb) -> contestId == null ? cb.conjunction() : cb.equal(root.get("id").get("contestId"), contestId);
    }

    public static Specification<PlaceCoverageParty> centerId(UUID centerId) {
        return (root, q, cb) -> centerId == null ? cb.conjunction() : cb.equal(root.get("centerId"), centerId);
    }

    public static Specification<PlaceCoverageParty> placeId(UUID placeId) {
        return (root, q, cb) -> placeId == null ? cb.conjunction() : cb.equal(root.get("id").get("placeId"), placeId);
    }

    /**
     * Filter by reported state (true => is_place_reported=1, false => 0)
     */
    public static Specification<PlaceCoverageParty> isPlaceReported(Boolean reported) {
        return (root, q, cb) -> {
            if (reported == null) return cb.conjunction();
            return cb.equal(root.get("isPlaceReported"), reported ? 1L : 0L);
        };
    }
}
