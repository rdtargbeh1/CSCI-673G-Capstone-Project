package election.ems_backend.views;

import election.ems_backend.views.entity.CandidateCenterStatsOfficial;
import jakarta.persistence.criteria.Path;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public final class CandidateCenterStatsOfficialSpecs {
    private CandidateCenterStatsOfficialSpecs() {}

    public static Specification<CandidateCenterStatsOfficial> electionEquals(UUID electionId) {
        return (root, query, cb) -> {
            if (electionId == null) return null;
            Path<UUID> p = root.get("id").get("electionId");
            return cb.equal(p, electionId);
        };
    }

    public static Specification<CandidateCenterStatsOfficial> contestEquals(UUID contestId) {
        return (root, query, cb) -> {
            if (contestId == null) return null;
            Path<UUID> p = root.get("id").get("contestId");
            return cb.equal(p, contestId);
        };
    }

    public static Specification<CandidateCenterStatsOfficial> countyEquals(UUID countyId) {
        return (root, query, cb) -> {
            if (countyId == null) return null;
            return cb.equal(root.get("countyId"), countyId);
        };
    }

    public static Specification<CandidateCenterStatsOfficial> districtEquals(UUID districtId) {
        return (root, query, cb) -> {
            if (districtId == null) return null;
            return cb.equal(root.get("districtId"), districtId);
        };
    }

    public static Specification<CandidateCenterStatsOfficial> centerEquals(UUID centerId) {
        return (root, query, cb) -> {
            if (centerId == null) return null;
            Path<UUID> p = root.get("id").get("centerId");
            return cb.equal(p, centerId);
        };
    }

    public static Specification<CandidateCenterStatsOfficial> candidateEquals(UUID candidateId) {
        return (root, query, cb) -> {
            if (candidateId == null) return null;
            Path<UUID> p = root.get("id").get("candidateId");
            return cb.equal(p, candidateId);
        };
    }

    public static Specification<CandidateCenterStatsOfficial> partyEquals(UUID partyId) {
        return (root, query, cb) -> {
            if (partyId == null) return null;
            return cb.equal(root.get("partyId"), partyId);
        };
    }
}