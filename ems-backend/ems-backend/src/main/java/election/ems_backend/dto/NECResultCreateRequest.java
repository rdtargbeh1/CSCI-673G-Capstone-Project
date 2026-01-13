package election.ems_backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.Map;
import java.util.UUID;

@Getter
@Setter
public class NECResultCreateRequest {

    @NotNull
    private UUID electionId;

    @NotNull
    private UUID centerId;

    @NotNull @Size(min = 1, message = "At least one candidate vote is required")
    private Map<UUID, @Min(0) Integer> candidateVotes; // candidateId -> votes

    @NotNull @Min(0)
    private Integer totalRegisteredVoters;

    @NotNull @Min(0)
    private Integer ballotsCast;

    @NotNull @Min(0)
    private Integer invalidBallots = 0;

    @NotNull @Min(0)
    private Integer unmarkedBallots = 0;
    private Integer unusedBallots = 0;

    @NotNull @Min(0)
    private Integer rejectedBallots = 0;

    @NotNull @Min(0)
    private Integer spoiledBallots = 0;

    @NotBlank
    @Size(max = 100)
    private String source;
}