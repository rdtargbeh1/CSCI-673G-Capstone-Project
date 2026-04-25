package election.ems_backend.views;

import election.ems_backend.views.entity.DistrictStatsOfficial;
import jakarta.persistence.criteria.Path;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public final class DistrictStatsOfficialSpecs {
    private DistrictStatsOfficialSpecs() {}

    public static Specification<DistrictStatsOfficial> electionEquals(UUID electionId) {
        return (root, query, cb) -> {
            if (electionId == null) return null;
            Path<UUID> p = root.get("id").get("electionId");
            return cb.equal(p, electionId);
        };
    }

    public static Specification<DistrictStatsOfficial> contestEquals(UUID contestId) {
        return (root, query, cb) -> {
            if (contestId == null) return null;
            Path<UUID> p = root.get("id").get("contestId");
            return cb.equal(p, contestId);
        };
    }

    public static Specification<DistrictStatsOfficial> districtEquals(UUID districtId) {
        return (root, query, cb) -> {
            if (districtId == null) return null;
            Path<UUID> p = root.get("id").get("districtId");
            return cb.equal(p, districtId);
        };
    }

    public static Specification<DistrictStatsOfficial> countyEquals(UUID countyId) {
        return (root, query, cb) -> {
            if (countyId == null) return null;
            return cb.equal(root.get("countyId"), countyId);
        };
    }
}