package election.ems_backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import election.ems_backend.enums.VoteStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * VoteSubmissionDto
 *
 * API representation of a vote submission.
 *
 * Includes:
 * - submission/election/location context
 * - candidate vote totals
 * - ballot reconciliation
 * - allocation context
 * - workflow / verification / flagging
 * - evidence summary
 * - audit timestamps
 * - provenance / integrity metadata
 * - discrepancy summary
 *
 * Ballot classification:
 *
 * INSIDE BALLOT BOX:
 * - candidate / valid votes
 * - invalid ballots
 * - rejected ballots
 * - unmarked ballots
 *
 * OUTSIDE BALLOT BOX:
 * - spoiled ballots
 * - unused ballots
 */
@Data
@Builder
public class VoteSubmissionDto {

    // =========================================================================
    // PRIMARY ID
    // =========================================================================

    private UUID submissionId;

    // =========================================================================
    // ORGANIZATION
    // =========================================================================

    private UUID orgId;
    private String orgName;

    // =========================================================================
    // ELECTION
    // =========================================================================

    private UUID electionId;
    private String electionName;
    private int year;

    // =========================================================================
    // POLLING CENTER
    // =========================================================================

    private UUID centerId;
    private String centerCode;
    private String centerName;

    // =========================================================================
    // CONTEST
    // =========================================================================

    private UUID contestId;
    private String contestName;
    private String contestCategory;
    private String contestScopeType;

    // =========================================================================
    // POLLING PLACE
    // =========================================================================

    private UUID placeId;
    private String placeCode;
    private Integer placeNumber;
    private String placeLabel;

    // =========================================================================
    // SUBMITTER
    // =========================================================================

    private UUID agentId;
    private String agentName;

    // =========================================================================
    // SUBMISSION TIME
    // =========================================================================

    private LocalDateTime submissionTime;

    // =========================================================================
    // CANDIDATE VOTES
    // =========================================================================

    /**
     * Internal serialized representation.
     * Hidden from normal API JSON.
     */
    @JsonIgnore
    private String candidateVotesJson;

    /**
     * candidateId -> vote count
     */
    private Map<String, Integer> candidateVotes;

    // =========================================================================
    // BALLOT RECONCILIATION
    // =========================================================================

    /**
     * Actual ballots physically found in the ballot box.
     *
     * ballotsInBox =
     * validVotes
     * + invalidBallots
     * + rejectedBallots
     * + unmarkedBallots
     */
    private Integer ballotsInBox;

    /**
     * Total ballots received by the polling place.
     */
    private Integer ballotsReceived;

    /**
     * Invalid ballot found inside the box.
     */
    private Integer invalidBallots;

    /**
     * Ballot inside the box with no valid selection.
     */
    private Integer unmarkedBallots;

    /**
     * Rejected ballot found inside the box.
     */
    private Integer rejectedBallots;

    /**
     * Spoiled ballot outside the box.
     *
     * Examples:
     * - torn/damaged ballot
     * - abandoned ballot
     * - ballot found outside proper voting process
     *
     * Spoiled ballots are NOT included in invalidTotal.
     */
    private Integer spoiledBallots;

    /**
     * Ballots never used.
     *
     * These are outside the ballot box.
     */
    private Integer unusedBallots;

    // =========================================================================
    // ALLOCATION CONTEXT
    // =========================================================================

    /**
     * Derived from polling-place allocation.
     */
    private Integer registeredVoters;

    /**
     * Derived from polling-place allocation.
     */
    private Integer ballotsIssued;

    /**
     * Expected physical ballots in box.
     *
     * ballotsReceived - spoiled - unused
     */
    private Integer expectedBallotsInBox;

    /**
     * actual ballotsInBox - expectedBallotsInBox
     */
    private Integer ballotDelta;

    /**
     * PLACE / CENTER / NONE
     */
    private String allocationSource;

    // =========================================================================
    // WORKFLOW STATUS
    // =========================================================================

    private VoteStatus status;

    /**
     * Current operational status comment.
     *
     * Examples:
     * [submission review] ...
     * [submission rejected] ...
     * [submission flagged] ...
     * [submission amended] ...
     */
    private String comments;

    // =========================================================================
    // FLAGGING
    // =========================================================================

    private UUID flaggedBy;
    private String flaggedByName;
    private LocalDateTime dateFlagged;

    // =========================================================================
    // GPS
    // =========================================================================

    private Double latitude;
    private Double longitude;

    // =========================================================================
    // VERIFICATION
    // =========================================================================

    private UUID verifiedBy;
    private String verifiedByName;
    private LocalDateTime dateVerified;

    // =========================================================================
    // REQUEST / DEVICE PROVENANCE
    // =========================================================================

    private String clientIp;
    private String userAgent;

    // =========================================================================
    // CRYPTOGRAPHIC / INTEGRITY PROVENANCE
    // =========================================================================

    private String submissionHash;
    private String chainHash;
    private String submissionSignature;
    private UUID submissionSignerKeyId;

    /**
     * Client retry protection key.
     */
    private String idempotencyKey;

    // =========================================================================
    // VERSIONING
    // =========================================================================

    /**
     * Version exposed by existing entity/audit model.
     */
    private Integer version;

    /**
     * Optional optimistic-lock value where separately exposed.
     */
    private Long optimisticLock;

    // =========================================================================
    // AUDIT TIMESTAMPS
    // =========================================================================

    /**
     * Database record creation timestamp.
     */
    private LocalDateTime dateCreated;

    /**
     * Database record last-update timestamp.
     */
    private LocalDateTime dateUpdated;

    /**
     * Soft-delete timestamp.
     */
    private LocalDateTime dateDeleted;

    // =========================================================================
    // EVIDENCE / TALLY SHEETS
    // =========================================================================

    /**
     * Number of tally-sheet evidence records associated with this submission.
     */
    private Integer tallySheetCount;

    /**
     * Convenience boolean for frontend display.
     */
    private Boolean hasTallySheet;

    /**
     * Primary tally-sheet reference.
     *
     * This may point to local storage during development or an S3-backed
     * storage reference in production.
     */
    private String tallySheetUrl;

    // =========================================================================
    // DERIVED VOTE TOTALS
    // =========================================================================

    /**
     * Sum of candidateVotes.
     */
    private Integer validVotes;

    /**
     * Invalid ballots physically inside the box.
     *
     * invalidTotal =
     * invalidBallots
     * + rejectedBallots
     * + unmarkedBallots
     *
     * IMPORTANT:
     * spoiledBallots are excluded because spoiled ballots are outside the box.
     */
    private Integer invalidTotal;

    /**
     * ballotsInBox / registeredVoters * 100
     */
    private Double turnoutPct;

    /**
     * validVotes / ballotsInBox * 100
     */
    private Double validPct;

    /**
     * invalidTotal / ballotsInBox * 100
     */
    private Double invalidPct;

    // =========================================================================
    // DISCREPANCIES
    // =========================================================================

    private Boolean hasDiscrepancy;
    private List<DiscrepancySummaryDto> discrepancies;

    // =========================================================================
    // DERIVED HELPERS
    // =========================================================================

    /**
     * Expected ballots physically inside the box.
     *
     * Received ballots are reconciled as:
     *
     * expected in box =
     * ballots received
     * - spoiled ballots
     * - unused ballots
     */
    @JsonIgnore
    public Integer getExpectedBallotsInBox() {
        int received = nz(ballotsReceived);
        int spoiled = nz(spoiledBallots);
        int unused = nz(unusedBallots);

        return received - spoiled - unused;
    }

    /**
     * Positive:
     * more ballots were found in the box than expected.
     *
     * Negative:
     * fewer ballots were found in the box than expected.
     */
    @JsonIgnore
    public Integer getBallotDelta() {
        return nz(ballotsInBox) - getExpectedBallotsInBox();
    }

    /**
     * Basic reconciliation discrepancy check.
     *
     * Inside-box votes must reconcile as:
     *
     * ballotsInBox =
     * candidate votes
     * + invalid
     * + rejected
     * + unmarked
     */
    @JsonIgnore
    public Boolean getHasDiscrepancy() {

        int candidateVoteTotal =
                candidateVotes != null
                        ? candidateVotes
                        .values()
                        .stream()
                        .mapToInt(VoteSubmissionDto::nz)
                        .sum()
                        : 0;

        int insideBoxTotal =
                candidateVoteTotal
                        + nz(invalidBallots)
                        + nz(rejectedBallots)
                        + nz(unmarkedBallots);

        boolean physicalBallotMismatch =
                getBallotDelta() != 0;

        boolean voteReconciliationMismatch =
                insideBoxTotal != nz(ballotsInBox);

        return physicalBallotMismatch
                || voteReconciliationMismatch;
    }


    // =========================================================================
    // INTERNAL NULL-SAFE NUMBER HELPER
    // =========================================================================

    private static int nz(Integer value) {
        return value == null ? 0 : value;
    }
}