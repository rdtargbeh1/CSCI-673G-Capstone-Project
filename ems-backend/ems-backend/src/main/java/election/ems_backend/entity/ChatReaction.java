package election.ems_backend.entity;


import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "chat_reaction",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_chat_reaction_msg_user_emoji",
                        columnNames = {"message_id", "user_id", "emoji"}
                )
        },
        indexes = {
                @Index(name = "idx_chat_reaction_msg", columnList = "message_id"),
                @Index(name = "idx_chat_reaction_user", columnList = "user_id")
        }
)
@EqualsAndHashCode(of = "reactionId")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatReaction {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "reaction_id", updatable = false, nullable = false)
    private UUID reactionId;

    /** The message this reaction belongs to */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "message_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_chat_reaction_message")
    )
    private ChatMessage message;

    /** The user who reacted */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "user_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_chat_reaction_user")
    )
    private SystemUser user;

    /** Emoji or symbol (e.g., 👍, ❤️, ✅) */
    @Column(name = "emoji", nullable = false, length = 64)
    private String emoji;

    /** When the reaction was created */
    @Column(name = "date_created", nullable = false)
    private LocalDateTime dateCreated = LocalDateTime.now();

    @PrePersist
    public void prePersist() {
        if (dateCreated == null) dateCreated = LocalDateTime.now();
    }
}