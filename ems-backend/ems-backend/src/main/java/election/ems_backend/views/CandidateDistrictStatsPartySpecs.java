package election.ems_backend.views;

import election.ems_backend.views.entity.CandidateDistrictStatsParty;
import jakarta.persistence.criteria.Path;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public final class CandidateDistrictStatsPartySpecs {
    private CandidateDistrictStatsPartySpecs() {}

    public static Specification<CandidateDistrictStatsParty> orgEquals(UUID orgId) {
        return (root, query, cb) -> {
            if (orgId == null) return null;
            Path<UUID> p = root.get("id").get("orgId");
            return cb.equal(p, orgId);
        };
    }

    public static Specification<CandidateDistrictStatsParty> electionEquals(UUID electionId) {
        return (root, query, cb) -> {
            if (electionId == null) return null;
            Path<UUID> p = root.get("id").get("electionId");
            return cb.equal(p, electionId);
        };
    }

    public static Specification<CandidateDistrictStatsParty> countyEquals(UUID countyId) {
        return (root, query, cb) -> {
            if (countyId == null) return null;
            return cb.equal(root.get("countyId"), countyId);
        };
    }

    public static Specification<CandidateDistrictStatsParty> districtEquals(UUID districtId) {
        return (root, query, cb) -> {
            if (districtId == null) return null;
            Path<UUID> p = root.get("id").get("districtId");
            return cb.equal(p, districtId);
        };
    }

    public static Specification<CandidateDistrictStatsParty> candidateEquals(UUID candidateId) {
        return (root, query, cb) -> {
            if (candidateId == null) return null;
            Path<UUID> p = root.get("id").get("candidateId");
            return cb.equal(p, candidateId);
        };
    }

    public static Specification<CandidateDistrictStatsParty> partyEquals(UUID partyId) {
        return (root, query, cb) -> {
            if (partyId == null) return null;
            return cb.equal(root.get("partyId"), partyId);
        };
    }
}