package election.ems_backend.views.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO returned to the frontend for election-level party stats.
 */
@Data
public class ElectionStatsPartyDto {
    private UUID orgId;
    private UUID electionId;

    private Integer registeredVoters;
    private Integer ballotsCast;
    private Integer validVotes;
    private Integer invalidTotal;

    private BigDecimal turnoutPct;
    private BigDecimal invalidPct;
}