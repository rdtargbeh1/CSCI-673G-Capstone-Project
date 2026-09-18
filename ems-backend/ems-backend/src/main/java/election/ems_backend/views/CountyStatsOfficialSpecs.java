
package election.ems_backend.views;

import election.ems_backend.views.entity.CountyStatsOfficial;
import jakarta.persistence.criteria.Path;
import org.springframework.data.jpa.domain.Specification;

import java.util.Set;
import java.util.UUID;

public final class CountyStatsOfficialSpecs {

    private CountyStatsOfficialSpecs() {
    }


    public static Specification<CountyStatsOfficial> electionEquals(
            UUID electionId
    ) {
        return (root, query, cb) -> {

            if (electionId == null) {
                return null;
            }

            Path<UUID> p =
                    root.get("id").get("electionId");

            return cb.equal(
                    p,
                    electionId
            );
        };
    }


    public static Specification<CountyStatsOfficial> contestEquals(
            UUID contestId
    ) {
        return (root, query, cb) -> {

            if (contestId == null) {
                return null;
            }

            Path<UUID> p =
                    root.get("id").get("contestId");

            return cb.equal(
                    p,
                    contestId
            );
        };
    }


    public static Specification<CountyStatsOfficial> countyEquals(
            UUID countyId
    ) {
        return (root, query, cb) -> {

            if (countyId == null) {
                return null;
            }

            Path<UUID> p =
                    root.get("id").get("countyId");

            return cb.equal(
                    p,
                    countyId
            );
        };
    }


    // ========================================================================
    // OPERATIONAL SCOPE FILTER
    // ========================================================================

    public static Specification<CountyStatsOfficial> countyIn(
            Set<UUID> countyIds
    ) {
        return (root, query, cb) -> {

            if (countyIds == null || countyIds.isEmpty()) {
                return cb.disjunction();
            }

            Path<UUID> countyPath =
                    root.get("id").get("countyId");

            return countyPath.in(
                    countyIds
            );
        };
    }
}