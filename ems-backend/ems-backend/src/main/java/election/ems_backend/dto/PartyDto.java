package election.ems_backend.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PartyDto {

    private UUID partyId;
    private String partyName;
    private String abbreviation;
    private String logoUrl;
    private LocalDateTime dateCreated;
    private LocalDateTime dateUpdated;

}
