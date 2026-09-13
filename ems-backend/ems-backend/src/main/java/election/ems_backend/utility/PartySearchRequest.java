package election.ems_backend.utility;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PartySearchRequest {

    private String q; // searches name/abbreviation

}
