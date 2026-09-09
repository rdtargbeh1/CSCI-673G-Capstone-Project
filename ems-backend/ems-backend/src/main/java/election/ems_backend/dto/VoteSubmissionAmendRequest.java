package election.ems_backend.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.Map;
import java.util.UUID;

@Getter
@Setter
public class VoteSubmissionAmendRequest {

    private UUID actorUserId;          // NEC admin

    private String reason;             // required

    private Map<String, Integer> candidateVotes;

    private Integer ballotsInBox;

    private Integer invalidBallots;

    private Integer unmarkedBallots;

    private Integer rejectedBallots;

    private Integer spoiledBallots;

    private Integer unusedBallots;

    // Typed certification signature
    private String typedSignature;

    // Certification statement shown to the user
    private String certificationStatement;

    // Explicit certification confirmation
    private Boolean certificationConfirmed;
}