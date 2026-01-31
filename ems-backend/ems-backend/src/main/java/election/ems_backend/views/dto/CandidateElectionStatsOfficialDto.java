package election.ems_backend.views.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO for candidate-level election official stats.
 */
@Data
public class CandidateElectionStatsOfficialDto {

    private UUID electionId;
    private UUID contestId;

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