package election.ems_backend.views;


import election.ems_backend.views.entity.CenterCoverageOfficial;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public class CenterCoverageOfficialSpecs {

    public static Specification<CenterCoverageOfficial> electionId(UUID electionId) {
        return (root, q, cb) -> electionId == null ? cb.conjunction() : cb.equal(root.get("id").get("electionId"), electionId);
    }

    public static Specification<CenterCoverageOfficial> contestId(UUID contestId) {
        return (root, q, cb) -> contestId == null ? cb.conjunction() : cb.equal(root.get("id").get("contestId"), contestId);
    }

    public static Specification<CenterCoverageOfficial> centerId(UUID centerId) {
        return (root, q, cb) -> centerId == null ? cb.conjunction() : cb.equal(root.get("id").get("centerId"), centerId);
    }

    public static Specification<CenterCoverageOfficial> started(Boolean started) {
        return (root, q, cb) -> {
            if (started == null) return cb.conjunction();
            return cb.equal(root.get("centerStarted"), started ? 1L : 0L);
        };
    }

    public static Specification<CenterCoverageOfficial> completed(Boolean completed) {
        return (root, q, cb) -> {
            if (completed == null) return cb.conjunction();
            return cb.equal(root.get("centerCompleted"), completed ? 1L : 0L);
        };
    }
}
