package election.ems_backend.dto;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class VoteSubmissionRankingUpsertRequest {

    @NotNull
    private UUID submissionId;

    @NotNull
    private UUID contestId;

    /**
     * JSON array of optionIds in rank order.
     * Example: ["uuid1","uuid2","uuid3"]
     */
    @NotNull
    private JsonNode ranking;
}
