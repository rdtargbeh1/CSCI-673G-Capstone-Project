package election.ems_backend.entity;

import election.ems_backend.security.BaseAuditedEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;


import java.time.LocalDateTime;
import java.util.UUID;

@EqualsAndHashCode(of = "messageId")
@Entity
@Table(
        name = "chat_message",
        indexes = {
                @Index(name = "idx_chat_msg_room_time", columnList = "room_id, date_created DESC"),
                @Index(name = "idx_chat_msg_org_time", columnList = "org_id, date_created DESC"),
                @Index(name = "idx_chat_msg_sender_time", columnList = "sender_id, date_created DESC"),
                @Index(name = "idx_chat_msg_reply_to", columnList = "reply_to")
        },
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_chat_msg_idempotent",
                        columnNames = {"sender_id", "client_guid"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage  extends BaseAuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "message_id", updatable = false, nullable = false)
    private UUID messageId;

    /** Organization this message belongs to */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "org_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_chat_message_org"))
    private Organization organization;

    /** Room where message was sent */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_chat_message_room"))
    private ChatRoom room;

    /** The sender (user who posted the message) */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_chat_message_sender"))
    private SystemUser sender;

    /** TEXT, IMAGE, FILE, SYSTEM */
    @Column(name = "content_type", length = 20, nullable = false)
    private String contentType = "TEXT";

    /** Message content — body for TEXT/SYSTEM types */
    @Column(columnDefinition = "TEXT")
    private String content;

    /** JSONB metadata — used for FILE or IMAGE (urls, ids, etc.) */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private java.util.Map<String, Object> metadata = new java.util.HashMap<>();

    /** Optional reply-to message */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reply_to",
            foreignKey = @ForeignKey(name = "fk_chat_message_reply"))
    private ChatMessage replyTo;

    /** Optional client GUID for idempotent sends */
    @Column(name = "client_guid")
    private UUID clientGuid;

    /** Timestamps */
    @Column(name = "date_created", nullable = false)
    private LocalDateTime dateCreated = LocalDateTime.now();

    @Column(name = "date_edited")
    private LocalDateTime dateEdited;

    @Column(name = "date_deleted")
    private LocalDateTime dateDeleted;

    /** Ensure defaults are applied */
    @PrePersist
    public void prePersist() {
        if (dateCreated == null) {
            dateCreated = LocalDateTime.now();
        }
        if (contentType == null || contentType.isBlank()) {
            contentType = "TEXT";
        }
        if (metadata == null) {
            metadata = new java.util.HashMap<>();
        }
    }

}