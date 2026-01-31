package election.ems_backend.views.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for candidate-level county stats (party dataset).
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
    private String abbreviation;

    private Integer candidateVotes;
    private Integer ballotsCast;
    private Integer totalValidVotes;
    private Integer totalInvalidVotes;

    private BigDecimal voteSharePct;
}