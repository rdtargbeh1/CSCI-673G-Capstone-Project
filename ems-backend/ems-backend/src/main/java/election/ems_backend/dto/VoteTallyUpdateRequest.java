package election.ems_backend.dto;

import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class VoteTallyUpdateRequest {
    @Min(0) private Integer voteCount;
    private UUID partyId;
    private UUID electId;
}
