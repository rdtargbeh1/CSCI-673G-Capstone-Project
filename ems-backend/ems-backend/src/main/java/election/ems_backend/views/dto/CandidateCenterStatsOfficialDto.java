package election.ems_backend.views.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for candidate-level center official stats (NEC published).
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
    private String partyCode;

    private Integer candidateVotes;
    private Integer registeredVoters;
    private Integer ballotsCast;
    private Integer centerValidVotes;
    private Integer centerInvalidTotal;

    private BigDecimal voteSharePct;
}