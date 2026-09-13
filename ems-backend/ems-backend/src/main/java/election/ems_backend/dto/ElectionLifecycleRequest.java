package election.ems_backend.dto;

import election.ems_backend.enums.ElectionAccessStatus;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class ElectionLifecycleRequest {

    /**
     * Broad access/lifecycle state of the election.
     *
     * DRAFT
     * AVAILABLE
     * ARCHIVED
     * CANCELLED
     *
     * The service must validate whether the requested transition
     * from the current state is allowed.
     */
    private ElectionAccessStatus accessStatus;


    /**
     * Date/time NEC makes the election available to permitted
     * tenant organizations.
     *
     * Expected ordering:
     *
     * availableAt <= startAt
     */
    private LocalDateTime availableAt;


    /**
     * Beginning of the election operational window.
     *
     * Expected ordering:
     *
     * availableAt <= startAt <= endAt
     */
    private LocalDateTime startAt;


    /**
     * End of the election operational window.
     *
     * Post-election activities may continue after this time
     * until availableUntil.
     *
     * Expected ordering:
     *
     * startAt <= endAt <= availableUntil
     */
    private LocalDateTime endAt;


    /**
     * Final date/time the election remains operationally available
     * before it becomes eligible for automatic archive.
     *
     * Expected ordering:
     *
     * endAt <= availableUntil
     */
    private LocalDateTime availableUntil;


    /**
     * Optional explanation when the election is manually archived
     * or moved into an exceptional historical state.
     *
     * The service should determine when this value is permitted.
     */
    @Size(max = 250)
    private String archivedReason;
}