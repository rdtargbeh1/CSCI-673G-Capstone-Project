package election.ems_backend.dto;

import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PartyUpdateRequest {

    @Size(max = 100)
    private String partyName;

    @Size(max = 10)
    private String abbreviation;

    @Size(max = 2048)
    private String logoUrl;
}
