package election.ems_backend.views;

import election.ems_backend.views.entity.CandidateElectionStatsOfficial;
import jakarta.persistence.criteria.Path;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public final class CandidateElectionStatsOfficialSpecs {
    private CandidateElectionStatsOfficialSpecs() {}

    public static Specification<CandidateElectionStatsOfficial> electionEquals(UUID electionId) {
        return (root, query, cb) -> {
            if (electionId == null) return null;
            Path<UUID> p = root.get("id").get("electionId");
            return cb.equal(p, electionId);
        };
    }

    public static Specification<CandidateElectionStatsOfficial> candidateEquals(UUID candidateId) {
        return (root, query, cb) -> {
            if (candidateId == null) return null;
            Path<UUID> p = root.get("id").get("candidateId");
            return cb.equal(p, candidateId);
        };
    }

    public static Specification<CandidateElectionStatsOfficial> partyEquals(UUID partyId) {
        return (root, query, cb) -> {
            if (partyId == null) return null;
            return cb.equal(root.get("partyId"), partyId);
        };
    }
}