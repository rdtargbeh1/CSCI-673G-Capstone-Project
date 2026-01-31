package election.ems_backend.views;

import election.ems_backend.views.entity.NecResultGeo;
import jakarta.persistence.criteria.Path;
import org.springframework.data.jpa.domain.Specification;

import java.time.OffsetDateTime;
import java.util.UUID;

public final class NecResultGeoSpecs {
    private NecResultGeoSpecs() {}

    public static Specification<NecResultGeo> electionEquals(UUID electionId) {
        return (root, query, cb) -> {
            if (electionId == null) return null;
            Path<UUID> p = root.get("electionId");
            return cb.equal(p, electionId);
        };
    }

    public static Specification<NecResultGeo> contestEquals(UUID contestId) {
        return (root, query, cb) -> {
            if (contestId == null) return null;
            return cb.equal(root.get("contestId"), contestId);
        };
    }

    public static Specification<NecResultGeo> countyEquals(UUID countyId) {
        return (root, query, cb) -> {
            if (countyId == null) return null;
            Path<UUID> p = root.get("countyId");
            return cb.equal(p, countyId);
        };
    }

    public static Specification<NecResultGeo> districtEquals(UUID districtId) {
        return (root, query, cb) -> {
            if (districtId == null) return null;
            Path<UUID> p = root.get("districtId");
            return cb.equal(p, districtId);
        };
    }

    public static Specification<NecResultGeo> centerEquals(UUID centerId) {
        return (root, query, cb) -> {
            if (centerId == null) return null;
            Path<UUID> p = root.get("centerId");
            return cb.equal(p, centerId);
        };
    }

    public static Specification<NecResultGeo> uploadedAfter(OffsetDateTime from) {
        return (root, query, cb) -> {
            if (from == null) return null;
            Path<OffsetDateTime> p = root.get("uploadTime");
            return cb.greaterThanOrEqualTo(p, from);
        };
    }

    public static Specification<NecResultGeo> uploadedBefore(OffsetDateTime to) {
        return (root, query, cb) -> {
            if (to == null) return null;
            Path<OffsetDateTime> p = root.get("uploadTime");
            return cb.lessThanOrEqualTo(p, to);
        };
    }
}