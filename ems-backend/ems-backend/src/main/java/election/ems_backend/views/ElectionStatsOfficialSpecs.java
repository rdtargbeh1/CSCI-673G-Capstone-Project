package election.ems_backend.views;

import election.ems_backend.views.entity.ElectionStatsOfficial;
import jakarta.persistence.criteria.Path;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

/**
 * Specification helpers for election-level official stats.
 *
 * Assumes ElectionStatsOfficial uses an embedded id field named "id"
 * containing electionId and contestId.
 */
public final class ElectionStatsOfficialSpecs {
    private ElectionStatsOfficialSpecs() {}

    public static Specification<ElectionStatsOfficial> electionEquals(UUID electionId) {
        return (root, query, cb) -> {
            if (electionId == null) return cb.conjunction();
            Path<UUID> p = root.get("id").get("electionId");
            return cb.equal(p, electionId);
        };
    }

    public static Specification<ElectionStatsOfficial> contestEquals(UUID contestId) {
        return (root, query, cb) -> {
            if (contestId == null) return cb.conjunction();
            Path<UUID> p = root.get("id").get("contestId");
            return cb.equal(p, contestId);
        };
    }
}