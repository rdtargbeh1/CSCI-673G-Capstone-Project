package election.ems_backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class VoteSubmissionContestBulkRequest {

    @NotNull
    private UUID submissionId;

    @NotNull
    private UUID orgId;

    @NotNull
    private UUID electionId;

    @NotNull
    private UUID contestId;

    @NotEmpty
    @Valid
    private List<Item> items;

    @Getter
    @Setter
    public static class Item {
        @NotNull
        private UUID optionId;

        private Integer voteValue = 0;
        private Integer rank;
    }
}
