package election.ems_backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class VoteTallyCreateRequest {

    @NotNull
    private UUID orgId;
    @NotNull private UUID electionId;
    @NotNull private UUID contestId;

    // Election-scoped IDs
    private UUID partyId; // election_party key part
    private UUID electId; // election_candidate.elect_id

    @NotNull
    @Min(0)
    private Integer voteCount;


}
