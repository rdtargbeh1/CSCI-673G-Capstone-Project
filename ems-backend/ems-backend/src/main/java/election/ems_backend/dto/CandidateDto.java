package election.ems_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CandidateDto {
    private UUID candidateId;
    private String fullName;
    private String position;
    private String photoUrl;
    private boolean isActive;
    private boolean independent;
    private LocalDateTime dateCreated;
    private LocalDateTime dateUpdated;

    private UUID partyId;
    private String partyName;
    private String abbreviation;

}
