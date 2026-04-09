package election.ems_backend.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class VoteSubmissionContestDto {
    private UUID scvId;

    private UUID submissionId;
    private UUID orgId;

    private UUID electionId;
    private UUID contestId;
    private UUID optionId;

    private Integer voteValue;
    private Integer rank;

    private LocalDateTime dateCreated;

    // optional convenience (UI)
    private String contestName;
    private String optionLabel;
}
