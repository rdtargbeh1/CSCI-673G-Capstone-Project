package election.ems_backend.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

/**
 * Request body for updating an ElectionCandidate.
 */
@Getter
@Setter
public class ElectionCandidateUpdateRequest {
    private UUID centerId; // allow updating polling center if needed
}