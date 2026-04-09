package election.ems_backend.views;

import election.ems_backend.views.entity.ElectionStatsOfficial;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

/**
 * Specification helpers for election-level official stats.
 */
public final class ElectionStatsOfficialSpecs {
    private ElectionStatsOfficialSpecs() {}

    public static Specification<ElectionStatsOfficial> electionEquals(UUID electionId) {
        return (root, query, cb) -> {
            if (electionId == null) return null;
            return cb.equal(root.get("electionId"), electionId);
        };
    }
}