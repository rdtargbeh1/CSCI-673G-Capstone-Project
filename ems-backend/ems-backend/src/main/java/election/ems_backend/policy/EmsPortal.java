package election.ems_backend.policy;

/**
 * ========================================================================
 * EMS PORTAL
 * ========================================================================
 *
 * Defines the top-level application experience available to the authenticated
 * user in the current organization context.
 *
 * IMPORTANT:
 *
 * Portal identity is NOT:
 *
 * - an election assignment
 * - a geographic assignment
 * - an election lifecycle state
 *
 * Election and geographic authorization are evaluated separately when the
 * user accesses election-scoped resources.
 * ========================================================================
 */
public enum EmsPortal {

    /**
     * Administrative application.
     *
     * Roles:
     *
     * SYSTEM_ADMIN
     * NEC_ADMIN
     * TENANT_ADMIN
     * ADMIN
     */
    ADMINISTRATIVE,

    /**
     * Dedicated election Operations application.
     *
     * Roles:
     *
     * TALLY_OFFICER
     * AUDITOR
     * COORDINATOR
     * OBSERVER
     * SUPERVISOR
     * FIELD_OFFICER
     * PRESIDING_OFFICER
     * DATA_ENTRY
     */
    OPERATIONS,

    /**
     * Authenticated user has no recognized EMS portal role in the current
     * organization context.
     */
    NONE
}