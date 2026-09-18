package election.ems_backend.entity;


import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder

@Entity
@Table(name = "user_session")
public class UserSession {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "session_id", nullable = false, updatable = false)
    private UUID sessionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false,
            foreignKey = @ForeignKey(name = "user_session_user_id_fkey"))
    private SystemUser user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id",
            foreignKey = @ForeignKey(name = "user_session_org_id_fkey"))
    private Organization organization;

    @Column(name = "date_created")
    private LocalDateTime dateCreated;

    @Column(name = "expires_date")
    private LocalDateTime expiresDate;

    @Column(name = "revoked", nullable = false)
    private boolean revoked = false;

    @PrePersist
    void onCreate() {
        if (dateCreated == null) {
            dateCreated = LocalDateTime.now();
        }
    }

    /** Convenience method for checking if the session is expired */
    public boolean isExpired() {
        return expiresDate != null && LocalDateTime.now().isAfter(expiresDate);
    }
}
