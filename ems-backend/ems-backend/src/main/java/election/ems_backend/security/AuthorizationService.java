package election.ems_backend.security;

import election.ems_backend.entity.OrgMembership;

import java.util.Set;

/**
 * Authorization facade for multi-tenant access control.
 *
 * Responsibilities:
 *  - Bind the authenticated user to the current tenant (from TenantContext)
 *  - Enforce membership is enabled
 *  - Check role-based access inside the tenant
 *
 * Usage:
 *   // Guard a controller or service
 *   authz.requireAny("ADMIN", "MODERATOR");
 *   // Quick checks
 *   if (authz.hasAny("VIEWER")) { ... }
 *   // Convenience
 *   Set<String> roles = authz.currentRoles();
 */
public interface AuthorizationService {

    /**
     * Ensures current authenticated user has an enabled membership in the current tenant.
     * @return the current OrgMembership (or a synthetic SYSTEM_ADMIN membership if global admin)
     * @throws org.springframework.security.access.AccessDeniedException when tenant is missing,
     *         user is unauthenticated, or membership is absent/disabled.
     */
    OrgMembership requireMembership();

    OrgMembership requireNecAdminOrPlatformAdmin();

    /**
     * Ensures current user has any of the provided role names (case-insensitive) in this tenant.
     * Global SYSTEM_ADMIN always passes.
     */
    OrgMembership requireAny(String... roleNames);

    /**
     * Returns true if the current user has any of the provided role names (case-insensitive)
     * in this tenant, or is a global SYSTEM_ADMIN.
     */
    boolean hasAny(String... roleNames);

    /**
     * Returns the effective role set for the current user in this tenant.
     * For global admins, returns {"SYSTEM_ADMIN"}.
     * Returns empty set when unauthenticated or not a member.
     */
    Set<String> currentRoles();

    void requirePlatformAdmin();

    /**
     * Ensures the caller is either:
     *  - a platform/system admin (global), OR
     *  - an enabled member of the current tenant with ANY of the provided role names.
     *
     * This variant is safe to call when there may be no TenantContext (platform operations),
     * because it first checks platform admin status before attempting tenant membership resolution.
     *
     * Throws AccessDeniedException when neither condition is satisfied.
     */
    void requireAnyInTenantOrPlatformAdmin(String... roleNames);
}