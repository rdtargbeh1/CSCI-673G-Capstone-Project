package election.ems_backend.utility;

import jakarta.persistence.Column;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@EqualsAndHashCode
public class ElectionPartyId implements Serializable {

    @Column(name = "election_id")
    private UUID electionId;

    @Column(name = "party_id")
    private UUID partyId;
}