package election.ems_backend.views;

import election.ems_backend.views.entity.CandidateDistrictStatsParty;
import jakarta.persistence.criteria.Path;
import org.springframework.data.jpa.domain.Specification;

import java.util.Set;
import java.util.UUID;

public final class CandidateDistrictStatsPartySpecs {

    private CandidateDistrictStatsPartySpecs() {
    }


    public static Specification<CandidateDistrictStatsParty> orgEquals(
            UUID orgId
    ) {
        return (root, query, cb) -> {

            if (orgId == null) {
                return cb.conjunction();
            }

            return cb.equal(
                    root.get("id").get("orgId"),
                    orgId
            );
        };
    }


    public static Specification<CandidateDistrictStatsParty> electionEquals(
            UUID electionId
    ) {
        return (root, query, cb) -> {

            if (electionId == null) {
                return cb.conjunction();
            }

            return cb.equal(
                    root.get("id").get("electionId"),
                    electionId
            );
        };
    }


    public static Specification<CandidateDistrictStatsParty> contestEquals(
            UUID contestId
    ) {
        return (root, query, cb) -> {

            if (contestId == null) {
                return cb.conjunction();
            }

            return cb.equal(
                    root.get("id").get("contestId"),
                    contestId
            );
        };
    }


    public static Specification<CandidateDistrictStatsParty> countyEquals(
            UUID countyId
    ) {
        return (root, query, cb) -> {

            if (countyId == null) {
                return cb.conjunction();
            }

            return cb.equal(
                    root.get("countyId"),
                    countyId
            );
        };
    }


    public static Specification<CandidateDistrictStatsParty> districtEquals(
            UUID districtId
    ) {
        return (root, query, cb) -> {

            if (districtId == null) {
                return cb.conjunction();
            }

            return cb.equal(
                    root.get("id").get("districtId"),
                    districtId
            );
        };
    }


    public static Specification<CandidateDistrictStatsParty> candidateEquals(
            UUID candidateId
    ) {
        return (root, query, cb) -> {

            if (candidateId == null) {
                return cb.conjunction();
            }

            return cb.equal(
                    root.get("id").get("candidateId"),
                    candidateId
            );
        };
    }


    public static Specification<CandidateDistrictStatsParty> partyEquals(
            UUID partyId
    ) {
        return (root, query, cb) -> {

            if (partyId == null) {
                return cb.conjunction();
            }

            return cb.equal(
                    root.get("partyId"),
                    partyId
            );
        };
    }


    // ========================================================================
    // OPERATIONAL SCOPE FILTERS
    // ========================================================================

    public static Specification<CandidateDistrictStatsParty> countyIn(
            Set<UUID> countyIds
    ) {
        return (root, query, cb) -> {

            if (countyIds == null || countyIds.isEmpty()) {
                return cb.disjunction();
            }

            return root
                    .get("countyId")
                    .in(countyIds);
        };
    }


    public static Specification<CandidateDistrictStatsParty> districtIn(
            Set<UUID> districtIds
    ) {
        return (root, query, cb) -> {

            if (districtIds == null || districtIds.isEmpty()) {
                return cb.disjunction();
            }

            Path<UUID> districtPath =
                    root.get("id").get("districtId");

            return districtPath.in(
                    districtIds
            );
        };
    }
}