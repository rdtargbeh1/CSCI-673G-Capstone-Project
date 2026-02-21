
package election.ems_backend.views.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO returned to the frontend for district-level party stats.
 *
 * Maps to view: public.v_district_stats_party
 */
@Data
public class DistrictStatsPartyDto {

    private UUID orgId;
    private UUID electionId;
    private UUID contestId;

    private UUID districtId;
    private String districtName;

    private UUID countyId;
    private String countyName;

    // counts (view uses bigint)
    private Long registeredVoters;
    private Long ballotsCast;
    private Long validVotes;
    private Long invalidTotal;

    // percentages (fn_pct)
    private BigDecimal turnoutPct;
    private BigDecimal invalidPct;

    // reporting / coverage
    private Long centersReported;
    private Long centersTotal;
    private BigDecimal reportingPct;

    // optional extra UI metric
    private Long centersStarted;
}
