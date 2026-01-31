package election.ems_backend.tenant;


import java.util.Optional;
import java.util.UUID;

public final class TenantContext {
    private static final ThreadLocal<TenantContext> CTX = new ThreadLocal<>();

    private final UUID userId;         // nullable
    private final UUID orgId;          // nullable
    private final boolean isSystemAdmin;

    private TenantContext(UUID userId, UUID orgId, boolean systemAdmin) {
        this.userId = userId;
        this.orgId = orgId;
        this.isSystemAdmin = systemAdmin;
    }

    public static void set(UUID userId, UUID orgId, boolean systemAdmin) {
        CTX.set(new TenantContext(userId, orgId, systemAdmin));
    }

    public static TenantContext get() { return CTX.get(); }
    public static void clear() { CTX.remove(); }

    public Optional<UUID> userId() { return Optional.ofNullable(userId); }
    public Optional<UUID> orgId() { return Optional.ofNullable(orgId); }
    public boolean isSystemAdmin() { return isSystemAdmin; }


    // ---------- New helpers ----------

    /** Returns current orgId or null if not set. */
    public static UUID getCurrentOrgIdOrNull() {
        TenantContext ctx = CTX.get();
        return (ctx == null) ? null : ctx.orgId;
    }


    /** Returns current orgId or throws IllegalStateException if missing. */
    public static UUID requireCurrentOrgId() {
        TenantContext ctx = CTX.get();
        if (ctx == null || ctx.orgId == null) {
            throw new IllegalStateException("No current orgId in TenantContext");
        }
        return ctx.orgId;
    }

    /** Returns current userId or throws IllegalStateException if missing. */
    public static UUID requireCurrentUserId() {
        TenantContext ctx = CTX.get();
        if (ctx == null || ctx.userId == null) {
            throw new IllegalStateException("No current userId in TenantContext");
        }
        return ctx.userId;
    }


    /** ✅ Returns current userId or null if not set. */
    public static UUID getCurrentUserIdOrNull() {
        TenantContext ctx = CTX.get();
        return (ctx == null) ? null : ctx.userId;
    }

    /** ✅ Static system-admin check (safe default=false). */
    public static boolean isSystemAdminContext() {
        TenantContext ctx = CTX.get();
        return ctx != null && ctx.isSystemAdmin;
    }


}

