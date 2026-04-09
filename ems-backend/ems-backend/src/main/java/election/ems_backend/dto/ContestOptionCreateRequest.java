package election.ems_backend.dto;


import election.ems_backend.enums.ContestOptionType;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class ContestOptionCreateRequest {

    @NotNull
    private UUID contestId;
    private UUID electionId;

    private ContestOptionType optionType = ContestOptionType.CANDIDATE;

    private UUID electId;     // required when optionType=CANDIDATE
    private String optionLabel;   // required when optionType=LABEL

    // optional; if null service will set next available order
    private Integer optionOrder;

    private Boolean isActive = true;
}
