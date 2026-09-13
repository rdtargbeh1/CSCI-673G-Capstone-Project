package election.ems_backend.entity;


import election.ems_backend.utility.ChatReadReceiptId;
import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Represents a per-user read status for a given chat message.
 * Each (message_id, user_id) pair is unique.
 */
@Entity
@Table(
        name = "chat_read_receipt",
        indexes = {
                @Index(name = "idx_chat_read_user", columnList = "user_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatReadReceipt {

    @EmbeddedId
    private ChatReadReceiptId id;

    /** The message that was read */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("messageId")
    @JoinColumn(
            name = "message_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_chat_read_receipt_message")
    )
    private ChatMessage message;

    /** The user who read the message */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("userId")
    @JoinColumn(
            name = "user_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_chat_read_receipt_user")
    )
    private SystemUser user;

    /** When the message was read */
    @Column(name = "date_read", nullable = false)
    private LocalDateTime dateRead = LocalDateTime.now();

    @PrePersist
    public void prePersist() {
        if (dateRead == null) dateRead = LocalDateTime.now();
    }
}
