
package election.ems_backend.views.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for v_candidate_district_stats_official
 */
@Data
public class CandidateDistrictStatsOfficialDto {

    private UUID electionId;
    private UUID contestId;

    private UUID countyId;
    private String countyName;

    private UUID districtId;
    private String districtName;

    private UUID candidateId;
    private String candidateName;

    private UUID partyId;
    private String partyName;
    private String partyCode; // maps to "abbreviation"

    // ✅ SUM() -> BIGINT
    private Long candidateVotes;
    private Long ballotsCast;
    private Long totalValidVotes;
    private Long totalInvalidVotes;

    private BigDecimal voteSharePct;

    // ✅ window outputs
    private Long rankInDistrict;
    private Long winnerVotes;
    private BigDecimal winnerVoteSharePct;
    private Long marginVotes;
    private BigDecimal marginPct;

    private Boolean isDistrictWinner;
}
