package election.ems_backend.views.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for candidate-level district stats (party dataset).
 */
@Data
public class CandidateDistrictStatsPartyDto {
    private UUID orgId;
    private UUID electionId;

    private UUID countyId;
    private String countyName;

    private UUID districtId;
    private String districtName;

    private UUID candidateId;
    private String candidateName;

    private UUID partyId;
    private String partyName;
    private String abbreviation;

    private Integer candidateVotes;
    private Integer ballotsCast;
    private Integer totalValidVotes;
    private Integer totalInvalidVotes;

    private BigDecimal voteSharePct;
}