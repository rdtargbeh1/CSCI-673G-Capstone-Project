package election.ems_backend.views;

import election.ems_backend.views.entity.CenterStatsOfficial;
import jakarta.persistence.criteria.Path;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public final class CenterStatsOfficialSpecs {
    private CenterStatsOfficialSpecs() {}

    public static Specification<CenterStatsOfficial> electionEquals(UUID electionId) {
        return (root, query, cb) -> {
            if (electionId == null) return null;
            Path<UUID> p = root.get("id").get("electionId");
            return cb.equal(p, electionId);
        };
    }

    public static Specification<CenterStatsOfficial> centerEquals(UUID centerId) {
        return (root, query, cb) -> {
            if (centerId == null) return null;
            Path<UUID> p = root.get("id").get("centerId");
            return cb.equal(p, centerId);
        };
    }

    public static Specification<CenterStatsOfficial> districtEquals(UUID districtId) {
        return (root, query, cb) -> {
            if (districtId == null) return null;
            return cb.equal(root.get("districtId"), districtId);
        };
    }

    public static Specification<CenterStatsOfficial> countyEquals(UUID countyId) {
        return (root, query, cb) -> {
            if (countyId == null) return null;
            return cb.equal(root.get("countyId"), countyId);
        };
    }
}