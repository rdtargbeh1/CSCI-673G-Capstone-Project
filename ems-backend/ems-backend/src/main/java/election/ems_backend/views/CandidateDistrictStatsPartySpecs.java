package election.ems_backend.views;

import election.ems_backend.views.entity.CandidateDistrictStatsParty;
import jakarta.persistence.criteria.Path;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public final class CandidateDistrictStatsPartySpecs {

    private CandidateDistrictStatsPartySpecs() {}

    public static Specification<CandidateDistrictStatsParty> orgEquals(UUID orgId) {
        return (root, query, cb) -> orgId == null
                ? cb.conjunction()
                : cb.equal(root.get("id").get("orgId"), orgId);
    }

    public static Specification<CandidateDistrictStatsParty> electionEquals(UUID electionId) {
        return (root, query, cb) -> electionId == null
                ? cb.conjunction()
                : cb.equal(root.get("id").get("electionId"), electionId);
    }

    public static Specification<CandidateDistrictStatsParty> contestEquals(UUID contestId) {
        return (root, query, cb) -> contestId == null
                ? cb.conjunction()
                : cb.equal(root.get("id").get("contestId"), contestId);
    }

    public static Specification<CandidateDistrictStatsParty> countyEquals(UUID countyId) {
        return (root, query, cb) -> countyId == null
                ? cb.conjunction()
                : cb.equal(root.get("countyId"), countyId);
    }

    public static Specification<CandidateDistrictStatsParty> districtEquals(UUID districtId) {
        return (root, query, cb) -> districtId == null
                ? cb.conjunction()
                : cb.equal(root.get("id").get("districtId"), districtId);
    }

    public static Specification<CandidateDistrictStatsParty> candidateEquals(UUID candidateId) {
        return (root, query, cb) -> candidateId == null
                ? cb.conjunction()
                : cb.equal(root.get("id").get("candidateId"), candidateId);
    }

    public static Specification<CandidateDistrictStatsParty> partyEquals(UUID partyId) {
        return (root, query, cb) -> partyId == null
                ? cb.conjunction()
                : cb.equal(root.get("partyId"), partyId);
    }
}