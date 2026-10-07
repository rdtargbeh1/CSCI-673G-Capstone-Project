
package election.ems_backend.views.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for candidate county stats (party dataset).
 *
 * Maps to view: public.v_candidate_county_stats_party
 */
@Data
public class CandidateCountyStatsPartyDto {

    private UUID orgId;
    private UUID electionId;
    private UUID contestId;

    private UUID countyId;
    private String countyName;

    private UUID candidateId;
    private String candidateName;

    private UUID partyId;
    private String partyName;
    private String partyCode; // maps to "abbreviation"

    // ✅ SUM() outputs -> BIGINT
    private Long candidateVotes;
    private Long ballotsCast;
    private Long totalValidVotes;
    private Long totalInvalidVotes;

    private BigDecimal voteSharePct;

    // ✅ window outputs
    private Long rankInCounty;
    private Long winnerVotes;
    private BigDecimal winnerVoteSharePct;
    private Long marginVotes;
    private BigDecimal marginPct;
    private Boolean isCountyWinner;
}
