package election.ems_backend.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VoteSubmissionContestDetailDto {

    private UUID scvId;
    private UUID submissionId;
    private UUID orgId;
    private UUID electionId;
    private UUID contestId;
    private UUID optionId;

    private Integer voteValue;
    private Integer rank;

    private UUID electId;
    private UUID candidateId;
    private String candidateFullName;

    private UUID partyId;
    private String partyName;
    private String partyAbbreviation;

    // ✅ Ready-to-render display text: "John Brown (CDC)"
    private String candidateDisplay;
}
