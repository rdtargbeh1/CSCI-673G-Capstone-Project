package election.ems_backend.dto;

import election.ems_backend.enums.AnomalyKind;
import lombok.Data;

import java.util.Map;
import java.util.UUID;

@Data
public class AnomalyEventUpdateRequest {
    private UUID centerId; // optional change
    private AnomalyKind kind;
    private Map<String, Object> details;
}
