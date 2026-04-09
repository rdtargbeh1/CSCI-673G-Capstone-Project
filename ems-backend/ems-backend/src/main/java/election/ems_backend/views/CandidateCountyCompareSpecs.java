package election.ems_backend.views;

import election.ems_backend.views.entity.CandidateCountyCompare;
import jakarta.persistence.criteria.Path;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public final class CandidateCountyCompareSpecs {
    private CandidateCountyCompareSpecs() {}

    public static Specification<CandidateCountyCompare> electionEquals(UUID electionId) {
        return (root, query, cb) -> {
            if (electionId == null) return null;
            Path<UUID> p = root.get("id").get("electionId");
            return cb.equal(p, electionId);
        };
    }

    public static Specification<CandidateCountyCompare> countyEquals(UUID countyId) {
        return (root, query, cb) -> {
            if (countyId == null) return null;
            Path<UUID> p = root.get("id").get("countyId");
            return cb.equal(p, countyId);
        };
    }

    public static Specification<CandidateCountyCompare> candidateEquals(UUID candidateId) {
        return (root, query, cb) -> {
            if (candidateId == null) return null;
            Path<UUID> p = root.get("id").get("candidateId");
            return cb.equal(p, candidateId);
        };
    }

    public static Specification<CandidateCountyCompare> orgEquals(UUID orgId) {
        return (root, query, cb) -> {
            if (orgId == null) return null;
            return cb.equal(root.get("orgId"), orgId);
        };
    }

    public static Specification<CandidateCountyCompare> partyEquals(UUID partyId) {
        return (root, query, cb) -> {
            if (partyId == null) return null;
            return cb.equal(root.get("partyId"), partyId);
        };
    }
}