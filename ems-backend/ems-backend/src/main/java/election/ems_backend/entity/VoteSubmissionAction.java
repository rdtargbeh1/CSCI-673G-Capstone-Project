package election.ems_backend.entity;

import election.ems_backend.enums.VoteSubmissionActionType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder

@Entity
@Table(
        name = "vote_submission_action",
        indexes = {
                @Index(name = "idx_vs_action_submission", columnList = "submission_id"),
                @Index(name = "idx_vs_action_submission_time", columnList = "submission_id,action_time"),
                @Index(name = "idx_vs_action_actor", columnList = "actor_user_id"),
                @Index(name = "idx_vs_action_type", columnList = "action_type"),
                @Index(name = "idx_vs_action_org", columnList = "org_id"),
                @Index(name = "idx_vs_action_org_time", columnList = "org_id,action_time")
        }
)
public class VoteSubmissionAction {

    // ========================================================================
    // PRIMARY KEY
    // ========================================================================

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "action_id", nullable = false, updatable = false)
    private UUID actionId;

    // ========================================================================
    // RELATIONSHIPS
    // ========================================================================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id", nullable = false, foreignKey = @ForeignKey(name = "fk_vs_action_submission")
    )
    private VoteSubmission submission;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", nullable = false, foreignKey = @ForeignKey(name = "fk_vs_action_organization"))
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_vs_action_actor"))
    private SystemUser actorUser;

    // ========================================================================
    // ACTION
    // ========================================================================

    @Enumerated(EnumType.STRING)
    @Column(
            name = "action_type",
            nullable = false,
            length = 30
    )
    private VoteSubmissionActionType actionType;

    @Column(
            name = "status_before",
            length = 30
    )
    private String statusBefore;

    @Column(
            name = "status_after",
            length = 30
    )
    private String statusAfter;

    // ========================================================================
    // EXPLANATION
    // ========================================================================

    @Column(
            name = "reason",
            columnDefinition = "text"
    )
    private String reason;

    @Column(
            name = "comments",
            columnDefinition = "text"
    )
    private String comments;

    // ========================================================================
    // CERTIFICATION
    // ========================================================================

    @Column(
            name = "typed_signature",
            length = 200
    )
    private String typedSignature;

    @Column(
            name = "certification_statement",
            columnDefinition = "text"
    )
    private String certificationStatement;

    @Column(
            name = "certification_confirmed",
            nullable = false
    )
    private Boolean certificationConfirmed = false;

    // ========================================================================
    // ACTION AUDIT
    // ========================================================================

    @Column(
            name = "action_time",
            nullable = false
    )
    private LocalDateTime actionTime = LocalDateTime.now();

    @Column(
            name = "client_ip",
            length = 100
    )
    private String clientIp;

    @Column(
            name = "user_agent",
            columnDefinition = "text"
    )
    private String userAgent;

    // ========================================================================
    // ACTION PAYLOAD
    // ========================================================================

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(
            name = "action_data",
            columnDefinition = "jsonb"
    )
    private Map<String, Object> actionData;
    // ========================================================================
    // CREATED
    // ========================================================================

    @Column(
            name = "date_created",
            nullable = false
    )
    private LocalDateTime dateCreated = LocalDateTime.now();
}