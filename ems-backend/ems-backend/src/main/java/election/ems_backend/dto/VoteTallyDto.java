package election.ems_backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class VoteTallyDto {
    private UUID tallyId;

    private UUID orgId;
    private String orgName;

    private UUID electionId;
    private String electionName;

    private UUID partyId;
    private String partyName;
    private String abbreviation;

    private UUID electId;
    private String fullName;

    private UUID contestId;
    private String contestName;

    private Integer voteCount;

    private LocalDateTime lastRecomputedAt;
    private UUID recomputedByUserId;
    private String recomputedByUserName;

    private LocalDateTime lastUpdated;
}
