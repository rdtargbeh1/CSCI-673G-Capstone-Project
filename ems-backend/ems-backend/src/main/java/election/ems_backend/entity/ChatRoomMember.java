package election.ems_backend.entity;


import election.ems_backend.enums.ChatMemberRole;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(
        name = "chat_room_member",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_chat_member_room_user", columnNames = {"room_id", "user_id"})
        },
        indexes = {
                @Index(name = "idx_chat_member_org_user", columnList = "org_id, user_id"),
                @Index(name = "idx_chat_member_room", columnList = "room_id"),
                @Index(name = "idx_chat_member_room_user", columnList = "room_id, user_id"),
                @Index(name = "idx_chat_member_room_seen", columnList = "room_id, user_id, last_seen_at DESC")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRoomMember {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "membership_id", updatable = false, nullable = false)
    private UUID membershipId;

    /** Room this membership belongs to */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_chat_member_room"))
    private ChatRoom room;

    /** Organization guard (must match room.org_id at DB level via trigger) */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "org_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_chat_member_org"))
    private Organization organization;

    /** The user who is a member of the room */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_chat_member_user"))
    private SystemUser user;

    /** 'MEMBER' or 'ADMIN' */
    @Enumerated(EnumType.STRING)
    @Column(name = "role_name", length = 20, nullable = false)
    private ChatMemberRole roleName; // MEMBER / ADMIN

    /** When the user joined the room */
    @Column(name = "joined_at", nullable = false)
    private LocalDateTime joinedAt = LocalDateTime.now();

    /** Optional pointer to the last message this user has seen */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "last_seen_message_id",
            foreignKey = @ForeignKey(name = "fk_chat_member_last_seen_msg"))
    private ChatMessage lastSeenMessage;

    /** When the user last viewed the room */
    @Column(name = "last_seen_at")
    private LocalDateTime lastSeenAt;

    @Column(name = "last_post_at")
    private LocalDateTime lastPostAt;

    /** Whether the room is muted for this user (no notifications) */
    @Column(name = "muted", nullable = false)
    private boolean muted = false;

    /** Membership enabled flag (used by message trigger) */
    @Column(name = "is_enabled", nullable = false)
    private boolean isEnabled = true;

    @Version
    @Column(name = "version")
    private Long version;


    @PrePersist
    public void prePersist() {
        if (membershipId == null) membershipId = UUID.randomUUID();
        if (joinedAt == null) joinedAt = LocalDateTime.now(ZoneOffset.UTC);
        // DO NOT override isEnabled here; default is set at field declaration.
    }
}