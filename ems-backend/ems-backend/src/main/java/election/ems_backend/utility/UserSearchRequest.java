package election.ems_backend.utility;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSearchRequest {

    private String q;
    private Boolean active;
    private UUID roleId;
    private UUID partyId;
    private UUID countyId;


}
