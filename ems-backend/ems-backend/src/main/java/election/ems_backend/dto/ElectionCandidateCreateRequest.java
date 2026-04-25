package election.ems_backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

/**
 * Request body for adding a candidate to an election.
 */
@Getter
@Setter
public class ElectionCandidateCreateRequest {

    @NotNull
    private UUID electionId;

    @NotNull
    private UUID candidateId;

    // optional polling center link (nullable = nationwide)
    private UUID centerId;
}