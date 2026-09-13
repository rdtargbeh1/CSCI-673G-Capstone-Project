package election.ems_backend.entity;

import election.ems_backend.enums.ActivityType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;



@Entity
@Table(name = "audit_log",
        indexes = {
                @Index(name = "idx_audit_log_org", columnList = "org_id"),
                @Index(name = "idx_audit_log_user", columnList = "user_id"),
                @Index(name = "idx_audit_log_type", columnList = "activity_type"),
                @Index(name = "idx_audit_log_date", columnList = "date_created")
        })

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "log_id", nullable = false, updatable = false)
    private UUID logId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "org_id",
            nullable = true,
            foreignKey = @ForeignKey(name = "audit_log_org_id_fkey")
    )
    private Organization organization;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true,
            foreignKey = @ForeignKey(name = "audit_log_user_id_fkey"))
    private SystemUser user;


    @Enumerated(EnumType.STRING)
    @Column(name = "activity_type", length = 50, nullable = false)
    private ActivityType activityType;

    @Column(name = "entity_affected", length = 100)
    private String entityAffected;

    @Column(name = "action_description", columnDefinition = "text")
    private String actionDescription;

    // optional JSON metadata for structured details
    @Column(name = "metadata", columnDefinition = "jsonb")
    private String metadata;

    @Column(name = "date_created")
    private LocalDateTime dateCreated;

    @PrePersist
    void prePersist() {
        if (dateCreated == null) dateCreated = LocalDateTime.now();
    }


}
