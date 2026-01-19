package election.ems_backend.views;

import election.ems_backend.views.entity.CandidateCenterStatsParty;
import jakarta.persistence.criteria.Path;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public final class CandidateCenterStatsPartySpecs {
    private CandidateCenterStatsPartySpecs() {}

    public static Specification<CandidateCenterStatsParty> orgEquals(UUID orgId) {
        return (root, query, cb) -> {
            if (orgId == null) return null;
            Path<UUID> p = root.get("id").get("orgId");
            return cb.equal(p, orgId);
        };
    }

    public static Specification<CandidateCenterStatsParty> electionEquals(UUID electionId) {
        return (root, query, cb) -> {
            if (electionId == null) return null;
            Path<UUID> p = root.get("id").get("electionId");
            return cb.equal(p, electionId);
        };
    }

    public static Specification<CandidateCenterStatsParty> countyEquals(UUID countyId) {
        return (root, query, cb) -> {
            if (countyId == null) return null;
            return cb.equal(root.get("countyId"), countyId);
        };
    }

    public static Specification<CandidateCenterStatsParty> districtEquals(UUID districtId) {
        return (root, query, cb) -> {
            if (districtId == null) return null;
            return cb.equal(root.get("districtId"), districtId);
        };
    }

    public static Specification<CandidateCenterStatsParty> centerEquals(UUID centerId) {
        return (root, query, cb) -> {
            if (centerId == null) return null;
            Path<UUID> p = root.get("id").get("centerId");
            return cb.equal(p, centerId);
        };
    }

    public static Specification<CandidateCenterStatsParty> candidateEquals(UUID candidateId) {
        return (root, query, cb) -> {
            if (candidateId == null) return null;
            Path<UUID> p = root.get("id").get("candidateId");
            return cb.equal(p, candidateId);
        };
    }

    public static Specification<CandidateCenterStatsParty> partyEquals(UUID partyId) {
        return (root, query, cb) -> {
            if (partyId == null) return null;
            return cb.equal(root.get("partyId"), partyId);
        };
    }
}