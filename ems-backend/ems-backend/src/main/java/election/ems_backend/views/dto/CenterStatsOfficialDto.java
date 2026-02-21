
package election.ems_backend.views.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * DTO returned by /api/stats/official/centers
 *
 * Maps to view: public.v_center_stats_official
 */
@Data
public class CenterStatsOfficialDto {

    private UUID electionId;
    private UUID contestId;
    private UUID centerId;

    private String centerCode;
    private String centerName;

    private UUID districtId;
    private String districtName;

    private UUID countyId;
    private String countyName;

    // bigint in view
    private Long registeredVoters;
    private Long ballotsIssued;

    private Long ballotsCast;
    private Long validVotes;
    private Long invalidTotal;

    // fn_pct outputs numeric
    private BigDecimal turnoutPct;
    private BigDecimal invalidPct;

    // coverage / allocation for UI
    private Long placesTotal;
    private Long placesReported;
    private BigDecimal placesReportingPct;

    private Long hasPlaceAllocation;
    private Long centerStarted;
    private Long centerPartial;
    private Long centerCompleted;

    // meta from nec_result
    private String source;
    private Instant uploadTime;
}
