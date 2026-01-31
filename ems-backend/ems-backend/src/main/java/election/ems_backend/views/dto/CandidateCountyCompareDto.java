package election.ems_backend.views.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for candidate county-level comparison (party vs official).
 */
@Data
public class CandidateCountyCompareDto {
    private UUID electionId;
    private UUID contestId;

    private UUID countyId;
    private String countyName;

    private UUID candidateId;
    private String candidateName;

    private UUID orgId; // party org (nullable)
    private UUID partyId;
    private String partyName;
    private String partyCode;

    private Integer partyCandidateVotes;
    private Integer officialCandidateVotes;
    private Integer diffVotes;

    private BigDecimal partyVoteSharePct;
    private BigDecimal officialVoteSharePct;
}