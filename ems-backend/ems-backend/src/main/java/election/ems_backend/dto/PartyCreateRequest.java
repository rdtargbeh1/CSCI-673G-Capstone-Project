package election.ems_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PartyCreateRequest {

    @NotBlank
    @Size(max = 100)
    private String partyName;

    @NotBlank @Size(max = 10)
    private String abbreviation;

    @Size(max = 2048)
    private String logoUrl;
}
