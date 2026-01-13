package election.ems_backend.dto;


import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Data Transfer Object for ElectionCandidate.
 */
@Data
@Builder
public class ElectionCandidateDto {
    private UUID electId;
    private UUID electionId;
    private String electionName;

    private UUID candidateId;
    private String fullName;

    private UUID centerId;
    private String centerName;

    private UUID partyId;
    private String partyAbbrev;

    private LocalDateTime dateCreated;
    private LocalDateTime dateUpdated;
}
