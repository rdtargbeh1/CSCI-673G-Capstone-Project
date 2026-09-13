package election.ems_backend.views;

import election.ems_backend.views.entity.CandidateDistrictStatsOfficial;
import jakarta.persistence.criteria.Path;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public final class CandidateDistrictStatsOfficialSpecs {
    private CandidateDistrictStatsOfficialSpecs() {}

    public static Specification<CandidateDistrictStatsOfficial> electionEquals(UUID electionId) {
        return (root, query, cb) -> {
            if (electionId == null) return null;
            Path<UUID> p = root.get("id").get("electionId");
            return cb.equal(p, electionId);
        };
    }

    public static Specification<CandidateDistrictStatsOfficial> contestEquals(UUID contestId) {
        return (root, query, cb) -> {
            if (contestId == null) return null;
            Path<UUID> p = root.get("id").get("contestId");
            return cb.equal(p, contestId);
        };
    }

    public static Specification<CandidateDistrictStatsOfficial> countyEquals(UUID countyId) {
        return (root, query, cb) -> {
            if (countyId == null) return null;
            return cb.equal(root.get("countyId"), countyId);
        };
    }

    public static Specification<CandidateDistrictStatsOfficial> districtEquals(UUID districtId) {
        return (root, query, cb) -> {
            if (districtId == null) return null;
            Path<UUID> p = root.get("id").get("districtId");
            return cb.equal(p, districtId);
        };
    }

    public static Specification<CandidateDistrictStatsOfficial> candidateEquals(UUID candidateId) {
        return (root, query, cb) -> {
            if (candidateId == null) return null;
            Path<UUID> p = root.get("id").get("candidateId");
            return cb.equal(p, candidateId);
        };
    }

    public static Specification<CandidateDistrictStatsOfficial> partyEquals(UUID partyId) {
        return (root, query, cb) -> {
            if (partyId == null) return null;
            return cb.equal(root.get("partyId"), partyId);
        };
    }
}