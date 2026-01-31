package election.ems_backend.views.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for election-level official (NEC) stats.
 */
@Data
public class ElectionStatsOfficialDto {

    private UUID electionId;
    private UUID contestId;

    private Integer registeredVoters;
    private Integer ballotsCast;
    private Integer validVotes;
    private Integer invalidTotal;

    private BigDecimal turnoutPct;
    private BigDecimal invalidPct;

    // ✅ NEW: reporting coverage
    private Integer centersReported;
    private Integer centersTotal;
    private BigDecimal reportingPct;
}
