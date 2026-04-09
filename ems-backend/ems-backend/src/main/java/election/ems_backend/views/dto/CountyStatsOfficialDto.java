package election.ems_backend.views.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for county-level official stats.
 */
@Data
public class CountyStatsOfficialDto {
    private UUID electionId;
    private UUID countyId;
    private String countyName;

    private Integer registeredVoters;
    private Integer ballotsCast;
    private Integer validVotes;
    private Integer invalidTotal;

    private BigDecimal turnoutPct;
    private BigDecimal invalidPct;
}