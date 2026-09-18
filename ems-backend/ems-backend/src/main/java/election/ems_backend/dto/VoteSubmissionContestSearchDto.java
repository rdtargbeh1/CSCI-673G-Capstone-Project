package election.ems_backend.dto;


import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class VoteSubmissionContestSearchDto {

    private UUID scvId;
    private UUID submissionId;

    private UUID orgId;
    private UUID electionId;

    private UUID contestId;
    private String contestName;

    private UUID optionId;
    private String optionLabel;

    private Integer voteValue;
    private Integer rank;

    // ✅ geo (from submission)
    private UUID countyId;
    private String countyName;

    private UUID districtId;
    private String districtName;

    private UUID centerId;
    private String centerName;

    // ✅ candidate + party (resolved from option → electionCandidate → candidate → party)
    private UUID electId;
    private UUID candidateId;
    private String candidateFullName;

    private UUID partyId;
    private String partyAbbreviation;

    private LocalDateTime dateCreated;
}

