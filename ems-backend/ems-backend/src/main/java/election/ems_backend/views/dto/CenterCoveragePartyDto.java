
package election.ems_backend.views.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for v_center_coverage_party.
 */
@Data
public class CenterCoveragePartyDto {

    private UUID orgId;
    private UUID electionId;
    private UUID contestId;
    private UUID centerId;

    // coverage
    private Long placesTotal;
    private Long placesReported;
    private BigDecimal placesReportingPct;

    private Long hasPlaceAllocation;
    private Long centerStarted;
    private Long centerPartial;
    private Long centerCompleted;

    // expectations
    private Long registeredVotersExpected;
    private Long ballotsIssuedExpected;
}
