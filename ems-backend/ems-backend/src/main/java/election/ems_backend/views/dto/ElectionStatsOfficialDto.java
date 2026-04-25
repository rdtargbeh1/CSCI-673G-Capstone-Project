
package election.ems_backend.views.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for election-level OFFICIAL stats.
 *
 * Maps to view: public.v_election_stats_official
 */
@Data
public class ElectionStatsOfficialDto {

    private UUID electionId;
    private UUID contestId;

    // bigint totals
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
