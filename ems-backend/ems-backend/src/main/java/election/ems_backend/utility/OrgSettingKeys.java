package election.ems_backend.utility;

public final class OrgSettingKeys {
    private OrgSettingKeys() {}

    public static final String RATE_LIMIT_PER_MIN = "rate_limit_per_min"; // Integer
    public static final String SHOW_OFFICIAL      = "show_official";      // Boolean
    public static final String LOCKOUT_THRESHOLD  = "lockout_threshold";  // Integer
    public static final String LOCKOUT_MINUTES    = "lockout_minutes";    // Integer
    // add more as you need...
}