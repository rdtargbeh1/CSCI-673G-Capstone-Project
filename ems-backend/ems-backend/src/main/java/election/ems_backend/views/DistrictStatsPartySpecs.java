package election.ems_backend.views;

import election.ems_backend.views.entity.DistrictStatsParty;
import jakarta.persistence.criteria.Path;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public final class DistrictStatsPartySpecs {
    private DistrictStatsPartySpecs() {
    }

    public static Specification<DistrictStatsParty> orgEquals(UUID orgId) {
        return (root, query, cb) -> {
            if (orgId == null) return null;
            Path<UUID> p = root.get("id").get("orgId");
            return cb.equal(p, orgId);
        };
    }

    public static Specification<DistrictStatsParty> electionEquals(UUID electionId) {
        return (root, query, cb) -> {
            if (electionId == null) return null;
            Path<UUID> p = root.get("id").get("electionId");
            return cb.equal(p, electionId);
        };
    }

    public static Specification<DistrictStatsParty> contestEquals(UUID contestId) {
        return (root, query, cb) -> {
            if (contestId == null) return null;
            Path<UUID> p = root.get("id").get("contestId");
            return cb.equal(p, contestId);
        };
    }


    public static Specification<DistrictStatsParty> districtEquals(UUID districtId) {
        return (root, query, cb) -> {
            if (districtId == null) return null;
            Path<UUID> p = root.get("id").get("districtId");
            return cb.equal(p, districtId);
        };
    }

    public static Specification<DistrictStatsParty> countyEquals(UUID countyId) {
        return (root, query, cb) -> {
            if (countyId == null) return null;
            return cb.equal(root.get("countyId"), countyId);
        };
    }

}