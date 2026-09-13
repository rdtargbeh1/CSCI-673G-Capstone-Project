package election.ems_backend.views;

import election.ems_backend.views.entity.CenterCoverageParty;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public class CenterCoveragePartySpecs {

    public static Specification<CenterCoverageParty> orgId(UUID orgId) {
        return (root, q, cb) -> orgId == null ? cb.conjunction() : cb.equal(root.get("id").get("orgId"), orgId);
    }

    public static Specification<CenterCoverageParty> electionId(UUID electionId) {
        return (root, q, cb) -> electionId == null ? cb.conjunction() : cb.equal(root.get("id").get("electionId"), electionId);
    }

    public static Specification<CenterCoverageParty> contestId(UUID contestId) {
        return (root, q, cb) -> contestId == null ? cb.conjunction() : cb.equal(root.get("id").get("contestId"), contestId);
    }

    public static Specification<CenterCoverageParty> centerId(UUID centerId) {
        return (root, q, cb) -> centerId == null ? cb.conjunction() : cb.equal(root.get("id").get("centerId"), centerId);
    }

    public static Specification<CenterCoverageParty> started(Boolean started) {
        return (root, q, cb) -> {
            if (started == null) return cb.conjunction();
            return cb.equal(root.get("centerStarted"), started ? 1L : 0L);
        };
    }

    public static Specification<CenterCoverageParty> completed(Boolean completed) {
        return (root, q, cb) -> {
            if (completed == null) return cb.conjunction();
            return cb.equal(root.get("centerCompleted"), completed ? 1L : 0L);
        };
    }
}