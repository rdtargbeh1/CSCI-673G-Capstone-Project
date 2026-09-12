package election.ems_backend.tenant;

import java.util.Optional;
import java.util.UUID;

public final class TenantContext {

    // ✅ Optional upgrade: InheritableThreadLocal helps child threads inherit context
    // (Still use TaskDecorator for pooled async if needed later)
    private static final ThreadLocal<TenantContext> CTX = new InheritableThreadLocal<>();

    private final UUID userId;         // nullable
    private final UUID orgId;          // nullable
    private final boolean isSystemAdmin;

    // ✅ Optional: store NEC admin flag for cleaner downstream checks / RLS variable consistency
    private final boolean isNecAdmin;

    private TenantContext(UUID userId, UUID orgId, boolean systemAdmin, boolean necAdmin) {
        this.userId = userId;
        this.orgId = orgId;
        this.isSystemAdmin = systemAdmin;
        this.isNecAdmin = necAdmin;
    }

    // ✅ Keep existing setter EXACTLY (backward compatible)
    public static void set(UUID userId, UUID orgId, boolean systemAdmin) {
        CTX.set(new TenantContext(userId, orgId, systemAdmin, false));
    }

    // ✅ New overload (optional to use)
    public static void set(UUID userId, UUID orgId, boolean systemAdmin, boolean necAdmin) {
        CTX.set(new TenantContext(userId, orgId, systemAdmin, necAdmin));
    }

    public static TenantContext get() { return CTX.get(); }
    public static void clear() { CTX.remove(); }

    public Optional<UUID> userId() { return Optional.ofNullable(userId); }
    public Optional<UUID> orgId() { return Optional.ofNullable(orgId); }
    public boolean isSystemAdmin() { return isSystemAdmin; }

    // ✅ New accessor (safe default=false via old set())
    public boolean isNecAdmin() { return isNecAdmin; }

    // ---------- New helpers ----------

    public static UUID getCurrentOrgIdOrNull() {
        TenantContext ctx = CTX.get();
        return (ctx == null) ? null : ctx.orgId;
    }

    public static UUID requireCurrentOrgId() {
        TenantContext ctx = CTX.get();
        if (ctx == null || ctx.orgId == null) {
            throw new IllegalStateException("No current orgId in TenantContext");
        }
        return ctx.orgId;
    }

    public static UUID requireCurrentUserId() {
        TenantContext ctx = CTX.get();
        if (ctx == null || ctx.userId == null) {
            throw new IllegalStateException("No current userId in TenantContext");
        }
        return ctx.userId;
    }

    public static UUID getCurrentUserIdOrNull() {
        TenantContext ctx = CTX.get();
        return (ctx == null) ? null : ctx.userId;
    }

    public static boolean isSystemAdminContext() {
        TenantContext ctx = CTX.get();
        return ctx != null && ctx.isSystemAdmin;
    }

    // ✅ Optional convenience
    public static boolean isNecAdminContext() {
        TenantContext ctx = CTX.get();
        return ctx != null && ctx.isNecAdmin;
    }
}


