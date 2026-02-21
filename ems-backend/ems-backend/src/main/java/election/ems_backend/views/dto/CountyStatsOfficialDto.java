
package election.ems_backend.views.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for county-level OFFICIAL stats.
 *
 * Maps to view: public.v_county_stats_official
 */
@Data
public class CountyStatsOfficialDto {

    private UUID electionId;
    private UUID contestId;

    private UUID countyId;
    private String countyName;

    // bigint totals
    private Long registeredVoters;
    private Long ballotsCast;
    private Long validVotes;
    private Long invalidTotal;

    // fn_pct numeric
    private BigDecimal turnoutPct;
    private BigDecimal invalidPct;

    // center reporting
    private Long centersReported;
    private Long centersTotal;
    private BigDecimal reportingPct;

    // district rollups
    private Long districtsReported;
    private Long districtsTotal;
    private Long districtsCompleted;
    private Long districtsStarted;

    // progress
    private Long centersStarted;
}
