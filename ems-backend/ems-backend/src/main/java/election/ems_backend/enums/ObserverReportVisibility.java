package election.ems_backend.enums;

public enum ObserverReportVisibility {

    PRIVATE,   // Only reported tenant sees (not NEC, not other tenants)
    SHARED,    // Reported tenant + NEC sees (other tenants don't)
    PUBLIC     // Everyone sees (all tenants, public dashboard)

}
