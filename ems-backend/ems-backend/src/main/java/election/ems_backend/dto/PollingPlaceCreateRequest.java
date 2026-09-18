package election.ems_backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class PollingPlaceCreateRequest {

    @NotNull
    private UUID centerId;

    /**
     * Optional human label: "Room 1", "Hall A", etc.
     */
    @Size(max = 100)
    private String label;
}