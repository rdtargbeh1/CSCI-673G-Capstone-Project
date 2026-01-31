package election.ems_backend.views.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO returned by /api/stats/official/centers
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

    private Integer registeredVoters;
    private Integer ballotsCast;
    private Integer validVotes;
    private Integer invalidTotal;

    private BigDecimal turnoutPct;
    private BigDecimal invalidPct;
}