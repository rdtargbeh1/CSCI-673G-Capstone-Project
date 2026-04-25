package election.ems_backend.enums;

public enum ChangeType {

        /**
         * Result row created or recalculated from VERIFIED vote submissions.
         * Happens during recomputeForCenterContest().
         */
        RECOMPUTED,

        /**
         * Result was officially published by NEC.
         * Cryptographically signed.
         */
        PUBLISHED,

        /**
         * Result was unpublished manually by NEC (admin action).
         */
        UNPUBLISHED_MANUAL,

        /**
         * Result auto-unpublished because publishedUntil expired.
         */
        UNPUBLISHED_EXPIRED,

        /**
         * Result removed because no VERIFIED submissions exist anymore
         * (e.g., submissions amended/rejected).
         */
        CLEARED


}
