
package election.ems_backend.views.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for election-level party statistics.
 *
 * Maps to view: public.v_election_stats_party
 */
@Data
public class ElectionStatsPartyDto {

    private UUID orgId;
    private UUID electionId;
    private UUID contestId;

    // totals (BIGINT)
    private Long registeredVoters;
    private Long ballotsCast;
    private Long validVotes;
    private Long invalidTotal;

    // percentages
    private BigDecimal turnoutPct;
    private BigDecimal invalidPct;

    // reporting
    private Long centersReported;
    private Long centersTotal;
    private BigDecimal reportingPct;

    // progress signal
    private Long centersStarted;
}
