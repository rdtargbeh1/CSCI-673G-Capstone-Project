package election.ems_backend.dto;

import election.ems_backend.enums.ContestOptionType;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class ContestOptionUpdateRequest {

    // usually don't change contestId in production; we will block it in service unless you want it
    private UUID contestId;
    private UUID electionId;

    private ContestOptionType optionType;

    private UUID electId;
    private String optionLabel;

    private Integer optionOrder;

    private Boolean isActive;
}
