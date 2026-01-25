package election.ems_backend.views.dto;


import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO returned to the frontend for election-level party stats.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ElectionStatsPartyDto {

    private UUID orgId;
    private UUID electionId;

    // ✅ FULL election basis
    private Long registeredVoters;

    // ✅ reported so far (VERIFIED)
    private Long ballotsCast;

    private Long validVotes;
    private Long invalidTotal;

    // percentages
    private BigDecimal turnoutPct;
    private BigDecimal invalidPct;

    // ✅ reporting coverage
    private Long centersReported;
    private Long centersTotal;
    private BigDecimal reportingPct;
}
