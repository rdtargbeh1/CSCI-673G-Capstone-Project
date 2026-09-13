
package election.ems_backend.views.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for candidate-level center stats (OFFICIAL dataset).
 *
 * Maps to view: public.v_candidate_center_stats_official
 */
@Data
public class CandidateCenterStatsOfficialDto {

    private UUID electionId;
    private UUID contestId;

    private UUID countyId;
    private String countyName;

    private UUID districtId;
    private String districtName;

    private UUID centerId;
    private String centerCode;
    private String centerName;

    private UUID candidateId;
    private String candidateName;

    private UUID partyId;
    private String partyName;
    private String partyCode; // maps to "abbreviation"

    // ✅ BIGINT in view
    private Long candidateVotes;
    private Long registeredVoters;
    private Long ballotsCast;
    private Long centerValidVotes;
    private Long centerInvalidTotal;

    private BigDecimal voteSharePct;

    // ✅ window outputs
    private Long rankInCenter;
    private Long winnerVotes;
    private BigDecimal winnerVoteSharePct;
    private Long marginVotes;
    private BigDecimal marginPct;

    private Boolean isCenterWinner;

    private Long rankCenterInDistrictForCandidate;
}
