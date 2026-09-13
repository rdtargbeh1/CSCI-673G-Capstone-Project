package election.ems_backend.enums;

public enum ObserverReportVerificationStatus {
    PENDING,              // Initial state
    INTERNAL_VERIFIED,    // Tenant verified (minor, internal only)
    NEC_VERIFIED,         // NEC investigated and approved
    UNDER_INVESTIGATION,  // Tenant escalates to NEC (critical)
    REJECTED              // NEC deems invalid
}


