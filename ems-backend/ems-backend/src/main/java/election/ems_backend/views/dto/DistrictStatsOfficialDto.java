
package election.ems_backend.views.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for district-level OFFICIAL stats.
 *
 * Maps to view: public.v_district_stats_official
 */
@Data
public class DistrictStatsOfficialDto {

    private UUID electionId;
    private UUID contestId;

    private UUID districtId;
    private String districtName;

    private UUID countyId;
    private String countyName;

    // bigint
    private Long registeredVoters;
    private Long ballotsCast;
    private Long validVotes;
    private Long invalidTotal;

    // fn_pct numeric
    private BigDecimal turnoutPct;
    private BigDecimal invalidPct;

    // reporting
    private Long centersReported;
    private Long centersTotal;
    private BigDecimal reportingPct;

    // progress
    private Long centersStarted;
}
