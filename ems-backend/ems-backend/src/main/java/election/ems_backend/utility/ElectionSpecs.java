package election.ems_backend.utility;

import election.ems_backend.entity.Election;
import election.ems_backend.enums.ElectionAccessStatus;
import election.ems_backend.enums.ElectionType;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;


public final class ElectionSpecs {

    private ElectionSpecs() {
    }


    // ========================================================================
    // BASIC SEARCH
    // ========================================================================

    public static Specification<Election> nameContains(
            String q
    ) {

        return (root, cq, cb) -> {

            if (
                    q == null ||
                            q.isBlank()
            ) {

                return cb.conjunction();
            }


            String search =
                    "%"
                            + q.trim()
                            .toLowerCase()
                            + "%";


            return cb.like(
                    cb.lower(
                            root.get("electionName")
                    ),
                    search
            );
        };
    }


    public static Specification<Election> yearEquals(
            Integer year
    ) {

        return (root, cq, cb) -> {

            if (year == null) {
                return cb.conjunction();
            }


            return cb.equal(
                    root.get("year"),
                    year
            );
        };
    }


    public static Specification<Election> typeEquals(
            ElectionType type
    ) {

        return (root, cq, cb) -> {

            if (type == null) {
                return cb.conjunction();
            }


            return cb.equal(
                    root.get("electionType"),
                    type
            );
        };
    }


    public static Specification<Election> activeEquals(
            Boolean active
    ) {

        return (root, cq, cb) -> {

            if (active == null) {
                return cb.conjunction();
            }


            return cb.equal(
                    root.get("isActive"),
                    active
            );
        };
    }


    // ========================================================================
    // ACCESS STATUS
    // ========================================================================

    public static Specification<Election> accessStatusEquals(
            ElectionAccessStatus accessStatus
    ) {

        return (root, cq, cb) -> {

            if (accessStatus == null) {
                return cb.conjunction();
            }


            return cb.equal(
                    root.get("accessStatus"),
                    accessStatus
            );
        };
    }


    // ========================================================================
    // CURRENT AVAILABILITY
    // ========================================================================

    /**
     * Election has reached availableAt and has not yet passed
     * availableUntil.
     *
     * This is a search condition only.
     * Authorization remains separate.
     */
    public static Specification<Election> availableNow(
            Boolean availableNow,
            LocalDateTime now
    ) {

        return (root, cq, cb) -> {

            if (
                    !Boolean.TRUE.equals(
                            availableNow
                    )
            ) {

                return cb.conjunction();
            }


            return cb.and(

                    cb.isNotNull(
                            root.get("availableAt")
                    ),

                    cb.lessThanOrEqualTo(
                            root.get("availableAt"),
                            now
                    ),

                    cb.or(

                            cb.isNull(
                                    root.get("availableUntil")
                            ),

                            cb.greaterThanOrEqualTo(
                                    root.get("availableUntil"),
                                    now
                            )
                    )
            );
        };
    }


    // ========================================================================
    // OPERATIONAL WINDOW
    // ========================================================================

    /**
     * AVAILABLE + active + startAt <= now <= endAt.
     */
    public static Specification<Election> operationalNow(
            Boolean operationalNow,
            LocalDateTime now
    ) {

        return (root, cq, cb) -> {

            if (
                    !Boolean.TRUE.equals(
                            operationalNow
                    )
            ) {

                return cb.conjunction();
            }


            return cb.and(

                    cb.equal(
                            root.get("accessStatus"),
                            ElectionAccessStatus.AVAILABLE
                    ),

                    cb.isTrue(
                            root.get("isActive")
                    ),

                    cb.isNotNull(
                            root.get("startAt")
                    ),

                    cb.isNotNull(
                            root.get("endAt")
                    ),

                    cb.lessThanOrEqualTo(
                            root.get("startAt"),
                            now
                    ),

                    cb.greaterThanOrEqualTo(
                            root.get("endAt"),
                            now
                    )
            );
        };
    }


    // ========================================================================
    // POST-ELECTION WINDOW
    // ========================================================================

    /**
     * AVAILABLE + active + election has ended,
     * but availableUntil has not yet passed.
     */
    public static Specification<Election> postElection(
            Boolean postElection,
            LocalDateTime now
    ) {

        return (root, cq, cb) -> {

            if (
                    !Boolean.TRUE.equals(
                            postElection
                    )
            ) {

                return cb.conjunction();
            }


            return cb.and(

                    cb.equal(
                            root.get("accessStatus"),
                            ElectionAccessStatus.AVAILABLE
                    ),

                    cb.isTrue(
                            root.get("isActive")
                    ),

                    cb.isNotNull(
                            root.get("endAt")
                    ),

                    cb.isNotNull(
                            root.get("availableUntil")
                    ),

                    cb.lessThan(
                            root.get("endAt"),
                            now
                    ),

                    cb.greaterThanOrEqualTo(
                            root.get("availableUntil"),
                            now
                    )
            );
        };
    }


    // ========================================================================
    // ARCHIVE DUE
    // ========================================================================

    /**
     * AVAILABLE election whose availableUntil deadline has
     * been reached or passed.
     */
    public static Specification<Election> archiveDue(
            Boolean archiveDue,
            LocalDateTime now
    ) {

        return (root, cq, cb) -> {

            if (
                    !Boolean.TRUE.equals(
                            archiveDue
                    )
            ) {

                return cb.conjunction();
            }


            return cb.and(

                    cb.equal(
                            root.get("accessStatus"),
                            ElectionAccessStatus.AVAILABLE
                    ),

                    cb.isNotNull(
                            root.get("availableUntil")
                    ),

                    cb.lessThanOrEqualTo(
                            root.get("availableUntil"),
                            now
                    )
            );
        };
    }


    // ========================================================================
    // TENANT-VISIBLE AVAILABLE ELECTION
    // ========================================================================

    /**
     * Database-level regular-tenant visibility for an AVAILABLE election.
     *
     * This does NOT include ARCHIVED or CANCELLED.
     */
    public static Specification<Election> tenantAvailable(
            LocalDateTime now
    ) {

        return (root, cq, cb) ->

                cb.and(

                        cb.equal(
                                root.get("accessStatus"),
                                ElectionAccessStatus.AVAILABLE
                        ),

                        cb.isTrue(
                                root.get("isActive")
                        ),

                        cb.isNotNull(
                                root.get("availableAt")
                        ),

                        cb.lessThanOrEqualTo(
                                root.get("availableAt"),
                                now
                        ),

                        cb.or(

                                cb.isNull(
                                        root.get("availableUntil")
                                ),

                                cb.greaterThanOrEqualTo(
                                        root.get("availableUntil"),
                                        now
                                )
                        )
                );
    }


    // ========================================================================
    // ARCHIVED
    // ========================================================================

    public static Specification<Election> archived() {

        return (root, cq, cb) ->

                cb.equal(
                        root.get("accessStatus"),
                        ElectionAccessStatus.ARCHIVED
                );
    }


    // ========================================================================
    // RELEASED CANCELLED ELECTION
    // ========================================================================

    /**
     * Cancelled election that had already reached its release time.
     *
     * A cancelled internal DRAFT election remains hidden from
     * ordinary tenants.
     */
    public static Specification<Election> releasedCancelled(
            LocalDateTime now
    ) {

        return (root, cq, cb) ->

                cb.and(

                        cb.equal(
                                root.get("accessStatus"),
                                ElectionAccessStatus.CANCELLED
                        ),

                        cb.isNotNull(
                                root.get("availableAt")
                        ),

                        cb.lessThanOrEqualTo(
                                root.get("availableAt"),
                                now
                        )
                );
    }


    // ========================================================================
    // UNRESTRICTED
    // ========================================================================

    public static Specification<Election> unrestricted() {

        return (root, cq, cb) ->
                cb.conjunction();
    }
}