package election.ems_backend.views;

import election.ems_backend.views.entity.CandidateCenterStatsParty;
import jakarta.persistence.criteria.Path;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public final class CandidateCenterStatsPartySpecs {

    private CandidateCenterStatsPartySpecs() {}

    public static Specification<CandidateCenterStatsParty> orgEquals(UUID orgId) {
        return (root, query, cb) -> {
            if (orgId == null) return cb.conjunction();
            return cb.equal(root.get("id").get("orgId"), orgId);
        };
    }

    public static Specification<CandidateCenterStatsParty> electionEquals(UUID electionId) {
        return (root, query, cb) -> {
            if (electionId == null) return cb.conjunction();
            return cb.equal(root.get("id").get("electionId"), electionId);
        };
    }

    // ✅ NEW: contest filter (CRITICAL)
    public static Specification<CandidateCenterStatsParty> contestEquals(UUID contestId) {
        return (root, query, cb) -> {
            if (contestId == null) return cb.conjunction();
            return cb.equal(root.get("id").get("contestId"), contestId);
        };
    }

    public static Specification<CandidateCenterStatsParty> countyEquals(UUID countyId) {
        return (root, query, cb) -> {
            if (countyId == null) return cb.conjunction();
            return cb.equal(root.get("countyId"), countyId);
        };
    }

    public static Specification<CandidateCenterStatsParty> districtEquals(UUID districtId) {
        return (root, query, cb) -> {
            if (districtId == null) return cb.conjunction();
            return cb.equal(root.get("districtId"), districtId);
        };
    }

    public static Specification<CandidateCenterStatsParty> centerEquals(UUID centerId) {
        return (root, query, cb) -> {
            if (centerId == null) return cb.conjunction();
            return cb.equal(root.get("id").get("centerId"), centerId);
        };
    }

    public static Specification<CandidateCenterStatsParty> candidateEquals(UUID candidateId) {
        return (root, query, cb) -> {
            if (candidateId == null) return cb.conjunction();
            return cb.equal(root.get("id").get("candidateId"), candidateId);
        };
    }

    public static Specification<CandidateCenterStatsParty> partyEquals(UUID partyId) {
        return (root, query, cb) -> {
            if (partyId == null) return cb.conjunction();
            return cb.equal(root.get("partyId"), partyId);
        };
    }


}