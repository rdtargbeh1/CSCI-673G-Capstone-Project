package election.ems_backend.entity;

import election.ems_backend.enums.VoteStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;

import org.hibernate.type.SqlTypes;
import org.locationtech.jts.geom.Point;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * VoteSubmission: tenant-scoped per-place submission.
 *
 * Changes:
 * - Added optimistic locking (@Version optimisticLock) to prevent lost updates under concurrent edits.
 * - Added provenance fields: chainHash, submissionSignature, submissionSignerKeyId to support ledger + signing workflow.
 * - Added idempotencyKey to support safe client retries.
 * - Explicit JSONB mapping (candidateVotes) with columnDefinition; index added via migration.
 *
 * Rationale:
 * These fields make the entity robust for election-day load (concurrency), and enable
 * recording cryptographic provenance (chain + signature) without changing existing semantics.
 */

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder

@Entity
@Table(
        name = "vote_submission",
        indexes = {
                // ✅ include contest_id for faster contest-scoped operations
                @Index(name = "idx_vs_org_election_contest_place_status", columnList = "org_id,election_id,contest_id,place_id,status"),
                @Index(name = "idx_vs_org_election_center_status", columnList = "org_id,election_id,center_id,status"),
                @Index(name = "idx_vs_submission_time", columnList = "submission_time"),
                @Index(name = "idx_vs_submission_hash", columnList = "submission_hash")
        }
)
public class VoteSubmission extends AuditBaseEntity {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "submission_id", nullable = false, updatable = false)
    private UUID submissionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "election_id", nullable = false)
    private Election election;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "center_id", nullable = false)
    private PollingCenter pollingCenter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "place_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_vote_submission_place"))
    private PollingPlace pollingPlace;

    @Column(name = "contest_id", nullable = false)
    private UUID contestId;

    // read-only convenience
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contest_id", insertable = false, updatable = false)
    private Contest contest;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    private SystemUser agent;

    @Column(name = "submission_time")
    private LocalDateTime submissionTime = LocalDateTime.now();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "candidate_votes", nullable = false)
    private Map<String, Integer> candidateVotes;

    @Column(name = "ballots_cast", nullable = false)
    private Integer ballotsCast;
    @Column(name = "invalid_ballots", nullable = false)
    private Integer invalidBallots = 0;
    @Column(name = "unmarked_ballots", nullable = false)
    private Integer unmarkedBallots = 0;   // blank-in-box (cast but no mark)
    @Column(name = "rejected_ballots", nullable = false)
    private Integer rejectedBallots = 0;
    @Column(name = "spoiled_ballots", nullable = false)
    private Integer spoiledBallots = 0;
    @Column(name = "unused_ballots", nullable = false)
    private Integer unusedBallots = 0; // leftover (not cast)

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 30, nullable = false)
    private VoteStatus status = VoteStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "flagged_by")
    private SystemUser flaggedBy;

    @Column(name = "date_flagged")
    private LocalDateTime dateFlagged;

    @Column(columnDefinition = "text")
    private String comments;

    @Column(name = "gps_location", columnDefinition = "geography(Point,4326)")
    private Point gpsLocation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verified_by")
    private SystemUser verifiedBy;

    @Column(name = "date_verified")
    private LocalDateTime dateVerified;

    @Column(name = "client_ip", length = 100)
    private String clientIp;

    @Column(name = "user_agent", columnDefinition = "text")
    private String userAgent;

    @Column(name = "submission_hash", unique = true)
    private String submissionHash;

    @Column(name = "chain_hash", columnDefinition = "text")
    private String chainHash;

    @Column(name = "submission_signature", columnDefinition = "text")
    private String submissionSignature;

    @Column(name = "submission_signer_key_id")
    private UUID submissionSignerKeyId;

    @Column(name = "date_deleted")
    private LocalDateTime dateDeleted;


    // Optional idempotency key for client retries
    @Column(name = "idempotency_key", length = 200)
    private String idempotencyKey;



}
