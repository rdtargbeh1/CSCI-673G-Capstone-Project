package election.ems_backend.views;

import election.ems_backend.views.entity.CandidateCountyStatsOfficial;
import jakarta.persistence.criteria.Path;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public final class CandidateCountyStatsOfficialSpecs {

    private CandidateCountyStatsOfficialSpecs() {}

    public static Specification<CandidateCountyStatsOfficial> electionEquals(UUID electionId) {
        return (root, query, cb) -> {
            if (electionId == null) return null;
            Path<UUID> p = root.get("id").get("electionId");
            return cb.equal(p, electionId);
        };
    }

    public static Specification<CandidateCountyStatsOfficial> contestEquals(UUID contestId) { // ✅ NEW
        return (root, query, cb) -> {
            if (contestId == null) return null;
            Path<UUID> p = root.get("id").get("contestId");
            return cb.equal(p, contestId);
        };
    }

    public static Specification<CandidateCountyStatsOfficial> countyEquals(UUID countyId) {
        return (root, query, cb) -> {
            if (countyId == null) return null;
            Path<UUID> p = root.get("id").get("countyId");
            return cb.equal(p, countyId);
        };
    }

    public static Specification<CandidateCountyStatsOfficial> candidateEquals(UUID candidateId) {
        return (root, query, cb) -> {
            if (candidateId == null) return null;
            Path<UUID> p = root.get("id").get("candidateId");
            return cb.equal(p, candidateId);
        };
    }

    public static Specification<CandidateCountyStatsOfficial> partyEquals(UUID partyId) {
        return (root, query, cb) -> {
            if (partyId == null) return null;
            return cb.equal(root.get("partyId"), partyId);
        };
    }
}