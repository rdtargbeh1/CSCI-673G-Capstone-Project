package election.ems_backend.views.dto;


import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for candidate-level election stats (party dataset).
 */
@Data
public class CandidateElectionStatsPartyDto {
    private UUID orgId;
    private UUID electionId;

    private UUID candidateId;
    private String candidateName;

    private UUID partyId;
    private String partyName;
    private String partyCode;

    private Integer candidateVotes;

    private Integer registeredVoters;
    private Integer ballotsCast;
    private Integer validVotes;
    private Integer invalidTotal;

    private BigDecimal voteSharePct;
}