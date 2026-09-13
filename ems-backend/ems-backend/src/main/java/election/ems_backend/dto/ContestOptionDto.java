package election.ems_backend.dto;

import election.ems_backend.enums.ContestOptionType;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for ContestOption used by admin API.
 */
@Data
public class ContestOptionDto {
    private UUID optionId;
    private UUID contestId;
    private UUID electionId;

    private ContestOptionType optionType;

    private UUID electId;
    private String electionCandidate;     // convenience for UI (optional)
    private String partyName;         // convenience for UI (optional)
    private String abbreviation;      // convenience for UI (optional)

    private String optionLabel;
    private Integer optionOrder;

    private Boolean isActive;

    private LocalDateTime dateCreated;
    private LocalDateTime dateUpdated;

}