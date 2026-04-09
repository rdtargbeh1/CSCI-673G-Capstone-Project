package election.ems_backend.entity;

import election.ems_backend.enums.RoomType;
import jakarta.persistence.*;
import jakarta.validation.constraints.AssertTrue;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;


import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

@Entity
@Table(name = "chat_room")
public class ChatRoom {
    @Id
//    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "room_id", updatable = false, nullable = false)
    private UUID roomId;

    /** Organization this chat belongs to */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "org_id", nullable = false, foreignKey = @ForeignKey(name = "fk_chat_room_org"))
    private Organization organization;

    /** GROUP / CHANNEL / DM */
    @Enumerated(EnumType.STRING)
    @Column(name = "room_type", nullable = false, length = 20)
    private RoomType roomType;

    /** Display name (null for DM) */
    @Column(length = 150)
    private String name;

    /** Optional description */
    @Column(columnDefinition = "TEXT")
    private String description;

    /** User who created the room */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false, foreignKey = @ForeignKey(name = "fk_chat_room_user"))
    private SystemUser createdBy;

    /** Creation timestamp */
    @Column(name = "date_created", nullable = false)
    private LocalDateTime dateCreated = LocalDateTime.now();

    /** Whether the room is archived */
    @Column(name = "is_archived", nullable = false)
    private boolean isArchived = false;

    /** JSONB settings: e.g., {"slowmode_sec": 3} */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> settings = new HashMap<>();


    /* ---------- Lifecycle ---------- */
    @PrePersist
    public void prePersist() {
        if (roomId == null) {
            roomId = UUID.randomUUID(); // or DB gen_random_uuid()
        }
        if (dateCreated == null) {
            dateCreated = LocalDateTime.now(ZoneOffset.UTC);
        }
        if (settings == null) {
            settings = new HashMap<>();
        }
        // default example: slowmode off unless provided
        settings.putIfAbsent("slowmode_sec", 0);
    }

    /* ---------- Bean Validation-style guard (optional) ---------- */
    @AssertTrue(message = "Non-DM rooms must have a name")
    private boolean isNameValidForType() {
        if (roomType == null) return true;
        return roomType == RoomType.DM || (name != null && !name.isBlank());
    }

    /* ---------- Equality ---------- */
    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ChatRoom other)) return false;
        return roomId != null && roomId.equals(other.roomId);
    }
    @Override public int hashCode() { return 31; }


}
