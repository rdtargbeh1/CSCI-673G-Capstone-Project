package election.ems_backend.tenant;


import java.util.UUID;

public final class OrgContext {
    private static final ThreadLocal<UUID> ORG_ID = new ThreadLocal<>();
    private OrgContext() {}

    public static void set(UUID orgId) { ORG_ID.set(orgId); }
    public static UUID get() { return ORG_ID.get(); }
    public static void clear() { ORG_ID.remove(); }
}