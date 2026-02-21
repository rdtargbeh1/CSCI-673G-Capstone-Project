
package election.ems_backend.views.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class CenterStatsPartyDto {
    private UUID orgId;
    private UUID electionId;
    private UUID contestId;

    private UUID centerId;
    private String centerCode;
    private String centerName;

    private UUID districtId;
    private String districtName;

    private UUID countyId;
    private String countyName;

    // BIGINT in view -> Long
    private Long registeredVoters;
    private Long ballotsIssued;

    private Long ballotsCast;
    private Long validVotes;
    private Long invalidTotal;

    private BigDecimal turnoutPct;
    private BigDecimal invalidPct;

    // ✅ coverage
    private Long placesTotal;
    private Long placesReported;
    private BigDecimal placesReportingPct;

    private Long hasPlaceAllocation;
    private Long centerStarted;
    private Long centerPartial;
    private Long centerCompleted;

    // existing enrichment fields (if you use them elsewhere)
    private Double centerLatitude;
    private Double centerLongitude;
}
