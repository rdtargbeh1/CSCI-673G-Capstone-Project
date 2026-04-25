package election.ems_backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import election.ems_backend.enums.VoteStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;


@Data
@Builder
public class VoteSubmissionDto {
    private UUID submissionId;

    private UUID orgId;
    private String orgName;

    private UUID electionId;
    private String electionName;
    private int year;

    // Polling Center
    private UUID centerId;
    private String centerCode;
    private String centerName;

    // contest context
    private UUID contestId;
    private String contestName;
    private String contestCategory;   // store as String for front-end convenience
    private String contestScopeType;  // store as String for front-end convenience


    // Polling Place
    private UUID placeId;
    private String placeCode;
    private Integer placeNumber;
    private String placeLabel;

    private UUID agentId;
    private String agentName;

    private LocalDateTime submissionTime;

    @JsonIgnore
    private String candidateVotesJson; // JSON string (candidateId -> votes)
    private Map<String, Integer> candidateVotes;

    private Integer ballotsInBox;
    private Integer ballotsReceived;
    private Integer invalidBallots;
    private Integer unmarkedBallots;
    private Integer rejectedBallots;
    private Integer spoiledBallots;
    private Integer unusedBallots;

    // Allocation context (read-only, derived from allocation tables)
    private Integer registeredVoters;   // from place allocation (or center fallback)
    private Integer ballotsIssued;      // from place allocation (or center fallback)
    private Integer expectedBallotsInBox;
    private Integer ballotDelta;  // different between actual and expected ballots
    private String allocationSource;    // "PLACE" or "CENTER" (or "NONE")

    private VoteStatus status;
    private String comments;

    private UUID flaggedBy;
    private String flaggedByName;
    private LocalDateTime dateFlagged;


    private Double latitude;
    private Double longitude;

    private UUID verifiedBy;
    private String verifiedByName;
    private LocalDateTime dateVerified;

    private String clientIp;
    private String userAgent;
    private String submissionHash;

    private Integer version;

    // NEW: derived helpers for UI (can be set by service or mapper)
    private Integer validVotes;    // sum of candidateVotes
    private Integer invalidTotal;  // invalid + blank + rejected

    private Double turnoutPct;     // ballotsInBox / registeredVoters * 100
    private Double invalidPct;     // invalidTotal / ballotsInBox * 100

    private UUID submissionSignerKeyId;
    private String submissionSignature;
    private String chainHash;
    private Long optimisticLock;
    private String idempotencyKey;

    private Boolean hasDiscrepancy;
    private List<DiscrepancySummaryDto> discrepancies;


    // === DERIVED FIELDS (calculated, not persisted) ===

    @JsonIgnore  // Optional: hide from API if needed
    public Integer getExpectedBallotsInBox() {
        // Formula: ballotsReceived - (spoiledBallots + unusedBallots)
        return ballotsReceived - (spoiledBallots + unusedBallots);
    }

    @JsonIgnore
    public Integer getBallotDelta() {
        // Formula: ballotsInBox - expectedBallotsInBox
        return ballotsInBox - getExpectedBallotsInBox();
    }


    @JsonIgnore
    public Boolean getHasDiscrepancy() {
        // Any ballot or vote mismatch
        Integer totalVotesInBox = invalidBallots + unmarkedBallots +
                (candidateVotes != null ? candidateVotes.values().stream()
                        .mapToInt(Integer::intValue).sum() : 0);
        return getBallotDelta() != 0 || totalVotesInBox != ballotsInBox;
    }



}
