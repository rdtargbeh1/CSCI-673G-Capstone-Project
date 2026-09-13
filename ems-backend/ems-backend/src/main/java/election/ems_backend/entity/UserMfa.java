package election.ems_backend.entity;

import election.ems_backend.enums.MfaMethod;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
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
        name = "user_mfa",
        indexes = {
                @Index(name = "idx_user_mfa_method", columnList = "method")
        }
)
public class UserMfa extends AuditBaseEntity  {

    // PK is also the FK to system_users.user_id
    @Id
    @Column(name = "user_id", nullable = false, updatable = false, columnDefinition = "uuid")
    private UUID userId;

    /** Link back to the user (shares same PK via @MapsId) */
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "user_id",
            foreignKey = @ForeignKey(name = "user_mfa_user_id_fkey"))
    private SystemUser user;

    @Enumerated(EnumType.STRING)
    @Column(name = "method", length = 20)
    private MfaMethod method; // null = not set up yet

    /** Store encrypted/hashed secret — NEVER expose via API */
    @Column(name = "secret_encrypted", columnDefinition = "text")
    private String secretEncrypted;

    /** Extra per-method data (issuer, label, phone country code, etc.) */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    /** Only meaningful for SMS; OK to keep generic */
    @Column(name = "phone_verified", nullable = false)
    private boolean phoneVerified = false;

    /** Last time MFA config changed (separate from AuditBaseEntity date_updated) */
    @Column(name = "date_mfa_updated")
    private LocalDateTime dateMfaUpdated;



    @PrePersist @PreUpdate
    void stamp() {
        this.dateMfaUpdated = LocalDateTime.now();
    }

}
