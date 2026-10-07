package election.ems_backend.entity;


import election.ems_backend.enums.DeliveryMethod;
import election.ems_backend.enums.NotificationPriority;
import election.ems_backend.enums.NotificationType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.time.LocalDateTime;
import java.util.UUID;


@Entity
@Table(
        name = "notification",
        indexes = {
                @Index(name = "idx_notification_user", columnList = "user_id, is_read"),
                @Index(name = "idx_notification_org", columnList = "org_id"),
                @Index(name = "idx_notification_related", columnList = "related_table, related_id")
        }
)

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @UuidGenerator
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "notification_id", updatable = false, nullable = false)
    private UUID notificationId;

    /** Organization this notification belongs to */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "org_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_notification_org"))
    private Organization organization;

    /** Target user */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_notification_user"))
    private SystemUser user;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", length = 50, nullable = false)
    private NotificationType type;

    /** Short title (e.g., “New Message”, “Vote Approved”) */
    @Column(name = "title", length = 150, nullable = false)
    private String title;

    /** Optional message body */
    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    /** Related table and record (for navigation) */
    @Column(name = "related_table", length = 50)
    private String relatedTable;

    @Column(name = "related_id")
    private UUID relatedId;

    /** Read/Seen flags */
    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;

    @Column(name = "is_seen", nullable = false)
    private boolean isSeen = false;

    /** When it was created / read / expires */
    @Column(name = "date_created", nullable = false)
    private LocalDateTime dateCreated = LocalDateTime.now();

    @Column(name = "date_read")
    private LocalDateTime dateRead;

    @Column(name = "date_expires")
    private LocalDateTime dateExpires;

    /** Priority: LOW, NORMAL, HIGH, CRITICAL */
    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false, length = 20)
    private NotificationPriority priority = NotificationPriority.NORMAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_method", length = 30, nullable = false)
    private DeliveryMethod deliveryMethod = DeliveryMethod.IN_APP;

    /** Optional creator (for audit trail) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by",
            foreignKey = @ForeignKey(name = "fk_notification_creator"))
    private SystemUser createdBy;

    @Column(name = "idempotency_key", length = 100, unique = true)
    private String idempotencyKey;

    @PrePersist
    void prePersist() {
        if (dateCreated == null) dateCreated = LocalDateTime.now();
        if (priority == null) priority = NotificationPriority.NORMAL;
        if (deliveryMethod == null) deliveryMethod = DeliveryMethod.IN_APP;
    }
}