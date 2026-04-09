package election.ems_backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class ElectionPartyAssignRequest {

    @NotNull
    @JsonIgnore
    private UUID electionId;

    @NotNull
    private UUID partyId;

    private Integer ballotOrder;

    // optional; default true
    private Boolean isQualified;
}
