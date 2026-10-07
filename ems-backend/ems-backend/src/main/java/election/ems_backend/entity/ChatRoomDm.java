package election.ems_backend.entity;


import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(of = "roomId")
@Entity
@Table(
        name = "chat_room_dm",
        // Mirrors the DB unique index (org_id, user1_id, user2_id)
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_chat_dm_pair",
                        columnNames = {"org_id", "user1_id", "user2_id"}
                )
        },
        indexes = {
                @Index(name = "idx_chat_dm_org_users", columnList = "org_id, user1_id, user2_id")
        }
)
public class ChatRoomDm {

    /** The DM room itself (1:1 with ChatRoom, shares PK) */
    @Id
    @Column(name = "room_id", nullable = false, updatable = false)
    private UUID roomId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(
            name = "room_id",
            foreignKey = @ForeignKey(name = "fk_chat_dm_room")
    )
    private ChatRoom room;

    /** Organization this DM belongs to */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "org_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_chat_dm_org")
    )
    private Organization organization;

    /** First participant (ordered lower UUID; see @PrePersist/@PreUpdate) */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "user1_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_chat_dm_user1")
    )
    private SystemUser user1;

    /** Second participant */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "user2_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_chat_dm_user2")
    )
    private SystemUser user2;

    /**
     * Keep user1/user2 in canonical order (by UUID text), to match DB trigger
     * and avoid unique-constraint conflicts for (org_id, user1_id, user2_id).
     */
    @PrePersist
    @PreUpdate
    private void ensureCanonicalOrder() {
        if (user1 != null && user2 != null) {
            UUID a = user1.getUserId();  // assumes SystemUser#getUserId()
            UUID b = user2.getUserId();
            if (a != null && b != null && a.toString().compareTo(b.toString()) > 0) {
                // swap
                SystemUser tmp = user1;
                user1 = user2;
                user2 = tmp;
            }
        }
        // If ChatRoom was assigned but roomId is missing, honor @MapsId
        if (room != null && roomId == null) {
            roomId = room.getRoomId();
        }
    }
}

