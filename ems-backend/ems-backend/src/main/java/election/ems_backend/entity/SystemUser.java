package election.ems_backend.entity;


import com.fasterxml.jackson.annotation.JsonIgnore;
import election.ems_backend.security.BaseAuditedEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

@Entity
@Table(
        name = "system_users",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_user_email", columnNames = "email")
        },
        indexes = {
                @Index(name="idx_users_email", columnList="email"),
                @Index(name="idx_users_username", columnList="user_name")
        }
)
@ToString(exclude = {"password", "role", "party", "assignedCounty", "defaultOrg"})
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class SystemUser extends BaseAuditedEntity {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "first_name", nullable = false, length = 30)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 30)
    private String lastName;

    @Column(name = "user_name", nullable = false, unique = true, length = 30)
    private String userName;

    @Column(name = "position", length = 50)
    private String position;

    @Column(name = "email", nullable = false, unique = true, length = 50)
    private String email;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;


    /**
     * Keep field name "password" for compatibility with existing service code (it maps to password_hash column).
     * Never serialize this value in any API response.
     */
    @JsonIgnore
    @Column(name = "password_hash", nullable = false, columnDefinition = "TEXT")
    private String password;

    /**
     * Relationships
     **/
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false, foreignKey = @ForeignKey(name = "fk_user_role"))
    private UserRole role;


    // Party reference
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "party_id", foreignKey = @ForeignKey(name = "fk_user_party"))
    private Party party;

    // County assignment
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_county", foreignKey = @ForeignKey(name = "fk_user_county"))
    private County assignedCounty;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "default_org_id", foreignKey = @ForeignKey(name = "fk_user_default_org"))
    private Organization defaultOrg;

    /**
     * Status flags
     **/
    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "is_verified", nullable = false)
    private boolean isVerified = false;

    @Column(name = "is_system_admin", nullable = false)
    private boolean isSystemAdmin = false;   // maps to SQL boolean column

    /**
     * Audit fields
     **/
    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    /**
     * Security / audit
     **/
    @Column(name = "failed_login_attempts", nullable = false)
    private int failedLoginAttempts = 0;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(name = "last_password_change")
    private LocalDateTime lastPasswordChange;

    @CreationTimestamp
    @Column(name = "date_created", nullable = false, updatable = false)
    private LocalDateTime dateCreated = LocalDateTime.now();

    @UpdateTimestamp
    @Column(name = "date_updated")
    private LocalDateTime dateUpdated;

    /**
     * New: signingKeyId - optional reference to an external signing key id for this user.
     * This is useful when users sign submissions or we record which key id produced signatures.
     */
    @Column(name = "signing_key_id")
    private UUID signingKeyId;

    /**
     * Profile photo support
     *
     * - profileImageUrl: optional text URL (CDN or direct storage link)
     * - profileImageUpload: optional relation to file_upload.upload_id (re-uses file storage)
     */
    @Column(name = "profile_image_url", columnDefinition = "text")
    private String profileImageUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profile_image_upload_id", foreignKey = @ForeignKey(name = "fk_user_profile_upload"))
    private FileUpload profileImageUpload;


    // Convenience helper
    @JsonIgnore
    public boolean isLocked() {
        return lockedUntil != null && lockedUntil.isAfter(LocalDateTime.now());
    }

    // GETTER & SETTER





}