package election.ems_backend.security;

import election.ems_backend.entity.OrgMembership;

import java.util.Set;

/**
 * Authorization facade for multi-tenant access control.
 *
 * Responsibilities:
 *  - Bind the authenticated user to the current tenant
 *  - Enforce enabled membership
 *  - Enforce tenant-scoped role access
 *  - Separate platform authority from tenant authority
 */
public interface AuthorizationService {

    /**
     * Resolves the current effective membership.
     *
     * SYSTEM_ADMIN may receive a synthetic membership because some
     * platform/shared operations intentionally do not require a real
     * org_membership row.
     */
    OrgMembership requireMembership();


    /**
     * Requires a REAL enabled tenant membership with one of the supplied roles.
     *
     * SYSTEM_ADMIN is intentionally excluded.
     *
     * When no role names are supplied, any real enabled tenant membership
     * is accepted.
     */
    OrgMembership requireAny(String... roleNames);


    /**
     * Returns true when requireAny(...) succeeds.
     *
     * SYSTEM_ADMIN does not automatically pass.
     */
    boolean hasAny(String... roleNames);


    /**
     * Returns the effective current role set.
     */
    Set<String> currentRoles();


    /**
     * SYSTEM_ADMIN only.
     */
    void requirePlatformAdmin();


    /**
     * SYSTEM_ADMIN OR NEC_ADMIN.
     */
    OrgMembership requireNecAdminOrPlatformAdmin();


    /**
     * SYSTEM_ADMIN OR NEC_ADMIN OR TENANT_ADMIN.
     *
     * Use for administrative operations that apply to any tenant,
     * including the NEC organization.
     */
    OrgMembership requireTopAdmin();


    /**
     * Requires the authenticated user to have any of the supplied roles.
     *
     * PLATFORM / SYSTEM USER:
     * - Must be explicitly marked as a system user.
     * - Does not require an organization or OrgMembership.
     * - Role is checked from SystemUser.role.
     *
     * NEC / TENANT USER:
     * - Must not be a system user.
     * - Requires current org_id.
     * - Requires an enabled OrgMembership for that org_id.
     * - Role is checked from OrgMembership.
     *
     * The same role may therefore exist in either domain.
     *
     * Example:
     *   requireAnyUserRole("ADMIN")
     *
     * may authorize:
     *   - platform ADMIN through SystemUser.role
     *   - NEC ADMIN-role user through OrgMembership
     *   - tenant ADMIN-role user through OrgMembership
     *
     * No role receives an automatic override unless that role is
     * explicitly supplied.
     */
    void requireAnyUserRole(String... roleNames);


}