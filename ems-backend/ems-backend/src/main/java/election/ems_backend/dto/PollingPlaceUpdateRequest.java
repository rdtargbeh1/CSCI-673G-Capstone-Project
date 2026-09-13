package election.ems_backend.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PollingPlaceUpdateRequest {
    @Size(max = 100)
    private String label;
    private Boolean active;
}
