package election.ems_backend.views;

import election.ems_backend.views.entity.CenterStatsParty;
import jakarta.persistence.criteria.Path;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public final class CenterStatsPartySpecs {
    private CenterStatsPartySpecs() {}

    public static Specification<CenterStatsParty> orgEquals(UUID orgId) {
        return (root, query, cb) -> {
            if (orgId == null) return null;
            Path<UUID> p = root.get("id").get("orgId");
            return cb.equal(p, orgId);
        };
    }

    public static Specification<CenterStatsParty> electionEquals(UUID electionId) {
        return (root, query, cb) -> {
            if (electionId == null) return null;
            Path<UUID> p = root.get("id").get("electionId");
            return cb.equal(p, electionId);
        };
    }

    public static Specification<CenterStatsParty> countyEquals(UUID countyId) {
        return (root, query, cb) -> {
            if (countyId == null) return null;
            return cb.equal(root.get("countyId"), countyId);
        };
    }

    public static Specification<CenterStatsParty> districtEquals(UUID districtId) {
        return (root, query, cb) -> {
            if (districtId == null) return null;
            return cb.equal(root.get("districtId"), districtId);
        };
    }

    public static Specification<CenterStatsParty> centerEquals(UUID centerId) {
        return (root, query, cb) -> {
            if (centerId == null) return null;
            return cb.equal(root.get("id").get("centerId"), centerId);
        };
    }
}