package election.ems_backend.views;

import election.ems_backend.views.entity.PlaceCoverageParty;
import jakarta.persistence.criteria.Path;
import org.springframework.data.jpa.domain.Specification;

import java.util.Set;
import java.util.UUID;

public class PlaceCoveragePartySpecs {


    public static Specification<PlaceCoverageParty> orgId(
            UUID orgId
    ) {
        return (root, q, cb) ->
                orgId == null
                        ? cb.conjunction()
                        : cb.equal(
                        root.get("id").get("orgId"),
                        orgId
                );
    }


    public static Specification<PlaceCoverageParty> electionId(
            UUID electionId
    ) {
        return (root, q, cb) ->
                electionId == null
                        ? cb.conjunction()
                        : cb.equal(
                        root.get("id").get("electionId"),
                        electionId
                );
    }


    public static Specification<PlaceCoverageParty> contestId(
            UUID contestId
    ) {
        return (root, q, cb) ->
                contestId == null
                        ? cb.conjunction()
                        : cb.equal(
                        root.get("id").get("contestId"),
                        contestId
                );
    }


    public static Specification<PlaceCoverageParty> centerId(
            UUID centerId
    ) {
        return (root, q, cb) ->
                centerId == null
                        ? cb.conjunction()
                        : cb.equal(
                        root.get("centerId"),
                        centerId
                );
    }


    public static Specification<PlaceCoverageParty> placeId(
            UUID placeId
    ) {
        return (root, q, cb) ->
                placeId == null
                        ? cb.conjunction()
                        : cb.equal(
                        root.get("id").get("placeId"),
                        placeId
                );
    }


    /**
     * Filter by reported state.
     *
     * true  -> is_place_reported = 1
     * false -> is_place_reported = 0
     */
    public static Specification<PlaceCoverageParty> isPlaceReported(
            Boolean reported
    ) {
        return (root, q, cb) -> {

            if (reported == null) {
                return cb.conjunction();
            }

            return cb.equal(
                    root.get("isPlaceReported"),
                    reported ? 1L : 0L
            );
        };
    }


    // ========================================================================
    // OPERATIONAL SCOPE FILTERS
    // ========================================================================

    public static Specification<PlaceCoverageParty> centerIn(
            Set<UUID> centerIds
    ) {
        return (root, query, cb) -> {

            if (centerIds == null || centerIds.isEmpty()) {
                return cb.disjunction();
            }

            return root
                    .get("centerId")
                    .in(centerIds);
        };
    }


    public static Specification<PlaceCoverageParty> placeIn(
            Set<UUID> placeIds
    ) {
        return (root, query, cb) -> {

            if (placeIds == null || placeIds.isEmpty()) {
                return cb.disjunction();
            }

            Path<UUID> placePath =
                    root.get("id").get("placeId");

            return placePath.in(
                    placeIds
            );
        };
    }
}