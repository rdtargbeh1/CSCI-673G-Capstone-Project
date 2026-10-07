package election.ems_backend.enums;

public enum DiscrepancyType {


    /**
     * OPENING PHASE: Ballot stock reconciliation
     * Check: ballots_issued == ballots_received
     */
    BALLOT_STOCK_MISMATCH,

    /**
     * CLOSING PHASE: Ballot accounting
     * Check: issued == cast + rejected + unused
     */
    BALLOT_RECONCILIATION_MISMATCH,

    /**
     * CLOSING PHASE: Vote tally
     * Check: sum(votes) + invalid == cast
     */
    VOTE_TALLY_MISMATCH,

    /**
     * CLOSING PHASE: Expected in box
     * Check: (received - unused - spoiled) == cast
     */
    BALLOTS_IN_BOX_MISMATCH,

    /**
     * POST PHASE: OCR audit
     * Check: tally_sheet_photo (OCR) == agent_submitted
     */
    OCR_MISMATCH




//    // 🔴 Ballot issues
//    BALLOT_SHORTAGE,
//    BALLOT_EXCESS,
//
//    // 🔴 Vote integrity
//    OVER_VOTING,              // votes > registered
//    VOTE_BALLOT_MISMATCH,     // votes != ballots
//    INVALID_COUNT_MISMATCH,
//
//    // 🔴 Data anomalies
//    ZERO_TURNOUT,
//    EXTREME_TURNOUT,
//
//    // 🔴 Manual / field reports
//    MANUAL_FLAG,
//
//    BALLOT_STOCK_MISMATCH,
//    BALLOT_RECONCILIATION_MISMATCH,
//    VOTE_TALLY_MISMATCH,
//    BALLOTS_IN_BOX_MISMATCH,
//    OCR_MISMATCH


}