package election.ems_backend.views;

import election.ems_backend.views.entity.ElectionStatsParty;
import jakarta.persistence.criteria.Path;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public final class ElectionStatsPartySpecs {
    private ElectionStatsPartySpecs() {}

    public static Specification<ElectionStatsParty> orgEquals(UUID orgId) {
        return (root, query, cb) -> {
            if (orgId == null) return null;
            Path<UUID> p = root.get("id").get("orgId");
            return cb.equal(p, orgId);
        };
    }

    public static Specification<ElectionStatsParty> electionEquals(UUID electionId) {
        return (root, query, cb) -> {
            if (electionId == null) return null;
            Path<UUID> p = root.get("id").get("electionId");
            return cb.equal(p, electionId);
        };
    }

    public static Specification<ElectionStatsParty> contestEquals(UUID contestId) {
        return (root, query, cb) -> {
            if (contestId == null) return null;
            Path<UUID> p = root.get("id").get("contestId");
            return cb.equal(p, contestId);
        };
    }


}
