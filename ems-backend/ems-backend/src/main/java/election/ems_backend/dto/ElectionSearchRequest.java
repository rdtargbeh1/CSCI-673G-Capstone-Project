package election.ems_backend.dto;

import election.ems_backend.enums.ElectionAccessStatus;
import election.ems_backend.enums.ElectionType;

public record ElectionSearchRequest(

        /**
         * Election name contains, case-insensitive.
         */
        String q,


        /**
         * Exact election year.
         */
        Integer year,


        /**
         * Election type.
         */
        ElectionType type,


        /**
         * Administrative active/inactive state.
         */
        Boolean active,


        /**
         * Broad election lifecycle/access state.
         *
         * DRAFT
         * AVAILABLE
         * ARCHIVED
         * CANCELLED
         */
        ElectionAccessStatus accessStatus,


        /**
         * When true:
         *
         * search only elections whose tenant availability
         * time has been reached.
         *
         * Typical interpretation:
         *
         * available_at IS NOT NULL
         * AND available_at <= CURRENT_TIMESTAMP
         */
        Boolean availableNow,


        /**
         * When true:
         *
         * search only elections currently inside their
         * operational window:
         *
         * start_at <= CURRENT_TIMESTAMP
         * AND end_at >= CURRENT_TIMESTAMP
         */
        Boolean operationalNow,


        /**
         * When true:
         *
         * search elections whose operational period has ended
         * but whose final availability window has not yet expired.
         *
         * Useful for post-election workflows.
         */
        Boolean postElection,


        /**
         * When true:
         *
         * search elections whose availableUntil has expired
         * and are therefore eligible for automatic archive.
         */
        Boolean archiveDue

) {

    /**
     * Backwards-friendly factory.
     *
     * Existing callers that only use the original four filters
     * can continue creating the request through this method.
     */
    public static ElectionSearchRequest of(
            String q,
            Integer year,
            ElectionType type,
            Boolean active
    ) {

        return new ElectionSearchRequest(
                q,
                year,
                type,
                active,
                null,
                null,
                null,
                null,
                null
        );
    }


    /**
     * Full search factory.
     */
    public static ElectionSearchRequest of(
            String q,
            Integer year,
            ElectionType type,
            Boolean active,
            ElectionAccessStatus accessStatus,
            Boolean availableNow,
            Boolean operationalNow,
            Boolean postElection,
            Boolean archiveDue
    ) {

        return new ElectionSearchRequest(
                q,
                year,
                type,
                active,
                accessStatus,
                availableNow,
                operationalNow,
                postElection,
                archiveDue
        );
    }
}