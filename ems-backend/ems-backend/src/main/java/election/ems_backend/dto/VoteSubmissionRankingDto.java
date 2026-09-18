package election.ems_backend.dto;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for submission_vote_ranking
 */
@Data
public class VoteSubmissionRankingDto {

    private UUID svrId;
    private UUID submissionId;
    private UUID contestId;
    private JsonNode ranking;
    private LocalDateTime dateCreated;

    private String contestName;
}
