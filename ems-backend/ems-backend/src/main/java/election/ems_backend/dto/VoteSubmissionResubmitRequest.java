package election.ems_backend.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
public class VoteSubmissionResubmitRequest {

    private UUID actorUserId;

    private String reason;

    private Map<String, Integer> candidateVotes;

    private Integer ballotsInBox;

    private Integer invalidBallots;

    private Integer unmarkedBallots;

    private Integer rejectedBallots;

    private Integer spoiledBallots;

    private Integer unusedBallots;

    private String typedSignature;

    private String certificationStatement;

    private Boolean certificationConfirmed;
}