package election.ems_backend.nec;

import java.util.UUID;

/**
        * Fired AFTER COMMIT when NEC-submitted + NEC-verified submission changes
 * require recomputing global nec_result for a specific contest+center.
 */
public record NecResultRecomputeEvent(
        Object source,
        UUID electionId,
        UUID contestId,
        UUID centerId,
        UUID triggeredByUserId
) {}
