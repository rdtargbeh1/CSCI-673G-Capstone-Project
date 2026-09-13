package election.ems_backend.enums;

public enum DiscrepancyReconciliationPhase {
    OPENING,   // before voting starts
    DURING,    // optional
    CLOSING,   // after voting
    POST       // NEC audit / reconciliation phase
}