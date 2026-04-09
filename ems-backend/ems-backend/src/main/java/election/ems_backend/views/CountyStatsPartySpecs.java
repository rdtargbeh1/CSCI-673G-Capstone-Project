package election.ems_backend.views;

import election.ems_backend.views.entity.CountyStatsParty;
import jakarta.persistence.criteria.Path;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public final class CountyStatsPartySpecs {
    private CountyStatsPartySpecs() {}

    public static Specification<CountyStatsParty> orgEquals(UUID orgId) {
        return (root, query, cb) -> {
            if (orgId == null) return null;
            Path<UUID> p = root.get("id").get("orgId");
            return cb.equal(p, orgId);
        };
    }

    public static Specification<CountyStatsParty> electionEquals(UUID electionId) {
        return (root, query, cb) -> {
            if (electionId == null) return null;
            Path<UUID> p = root.get("id").get("electionId");
            return cb.equal(p, electionId);
        };
    }

    public static Specification<CountyStatsParty> countyEquals(UUID countyId) {
        return (root, query, cb) -> {
            if (countyId == null) return null;
            Path<UUID> p = root.get("id").get("countyId");
            return cb.equal(p, countyId);
        };
    }
}