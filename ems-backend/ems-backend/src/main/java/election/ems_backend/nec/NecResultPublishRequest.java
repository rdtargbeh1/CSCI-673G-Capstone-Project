package election.ems_backend.nec;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;


@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NecResultPublishRequest {

    @NotNull
    private UUID actorUserId; // who published (NEC/SYSTEM admin)

    @NotNull
    private LocalDateTime publishedUntil;

}
