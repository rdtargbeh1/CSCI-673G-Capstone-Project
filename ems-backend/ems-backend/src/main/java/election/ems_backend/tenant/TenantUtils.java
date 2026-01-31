package election.ems_backend.tenant;


import java.util.UUID;

/**
 * Utility class to safely extract tenant context information.
 */
public final class TenantUtils {

    private TenantUtils() {}

    /** Returns the current tenant's organization ID or throws if missing. */
    public static UUID requireTenantOrg() {
        TenantContext ctx = TenantContext.get();
        UUID orgId = (ctx != null) ? ctx.orgId().orElse(null) : null;
        if (orgId == null) throw new IllegalStateException("X-Org-Id is required for this operation");
        return orgId;
    }

    /** Returns the current authenticated user's ID or throws if missing. */
    public static UUID requireUserId() {
        TenantContext ctx = TenantContext.get();
        UUID userId = (ctx != null) ? ctx.userId().orElse(null) : null;
        if (userId == null) throw new IllegalStateException("Authenticated user is required");
        return userId;
    }

    /** Returns true if the current user is a system admin. */
    public static boolean isSystemAdmin() {
        TenantContext ctx = TenantContext.get();
        return ctx != null && ctx.isSystemAdmin();
    }

    /** Nullable, non-throwing (useful in WS/SSE handshakes, schedulers, filters). */
    public static UUID currentTenantOrg() {
        TenantContext ctx = TenantContext.get();
        return (ctx != null) ? ctx.orgId().orElse(null) : null;
    }

    /** Nullable, non-throwing (useful in WS/SSE handshakes, schedulers, filters). */
    public static UUID currentUserId() {
        TenantContext ctx = TenantContext.get();
        return (ctx != null) ? ctx.userId().orElse(null) : null;
    }
}
