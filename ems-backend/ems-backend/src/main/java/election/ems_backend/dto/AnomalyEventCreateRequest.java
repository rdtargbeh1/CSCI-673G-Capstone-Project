package election.ems_backend.dto;

import election.ems_backend.enums.AnomalyKind;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;
import java.util.UUID;

@Data
public class AnomalyEventCreateRequest {
    @NotNull
    private UUID orgId;
    @NotNull private UUID electionId;
    private UUID centerId; // optional
    @NotNull private AnomalyKind kind;
    @NotNull private Map<String, Object> details;
}
