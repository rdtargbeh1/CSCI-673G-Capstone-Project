package election.ems_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.UUID;

@Data
@AllArgsConstructor
public class CandidateScopedTotalDto {
    private UUID candidateId;
    private UUID scopeId;     // null, countyId, or districtId
    private String scopeName; // optional label
    private long votes;
    private long registeredVoters;
    private long ballotsCast;
    private long invalidBallots;
    private long blankBallots;
    private long rejectedBallots;
    private long spoiledBallots;
    private double voteSharePct; // computed in service
}