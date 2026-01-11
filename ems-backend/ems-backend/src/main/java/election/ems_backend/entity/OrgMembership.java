package election.ems_backend.entity;

import election.ems_backend.security.BaseAuditedEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import org.springframework.data.annotation.CreatedDate;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Tenant-scoped membership tying a {@link SystemUser} to an {@link Organization}.
 *
 * <p>
 * DB contract (from your DDL):
 * <ul>
 *   <li><b>UNIQUE (org_id, user_id)</b> – a user can have at most one membership per org.</li>
 *   <li><b>role_name</b> – textual role within this org (e.g., ADMIN, PARTY_ADMIN, AGENT...).</li>
 *   <li><b>is_enabled</b> – toggle access to this tenant without deleting history.</li>
 * </ul>
 *
 * <p>
 * Notes:
 * <ul>
 *   <li>We keep {@code roleName} as text to mirror the table and stay flexible per-tenant.</li>
 *   <li>Ownership of business rules (who can set which role) stays in the service/auth layer.</li>
 *   <li>This entity intentionally has no timestamps because the table doesn’t define them.</li>
 * </ul>
 */

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder

@Entity
@Table(
        name = "org_membership",
        uniqueConstraints = @UniqueConstraint(name = "uq_org_user", columnNames = {"org_id", "user_id"})
)
public class OrgMembership extends BaseAuditedEntity {

    /** Surrogate key for the membership row. */
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "membership_id", nullable = false, updatable = false)
    private UUID membershipId;

    /**
     * Owning organization (tenant).
     *
     * <p><b>Important:</b> In your snippet the column was {@code ord_id} (typo).
     * The table uses {@code org_id}, so we fix it here to match the DDL.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_id", nullable = false, foreignKey = @ForeignKey(name = "fk_membership_org"))
    private Organization organization;

    /** User who is a member of the organization. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, foreignKey = @ForeignKey(name = "fk_membership_user"))
    private SystemUser user;

    /**
     * Role name (text) within this org.
     * Keep aligned with your platform roles: ADMIN, PARTY_ADMIN, AGENT, OBSERVER, SUPERVISOR, COORDINATOR.
     */
    @Column(name = "role_name", nullable = false, length = 30)
    private String roleName;

    /** Enable/disable this membership without deleting it. */
    @Column(name = "is_enabled", nullable = false)
    private  boolean isEnabled = true;

    @CreatedDate
    @Column(name = "date_created", updatable = false, nullable = false)
    private LocalDateTime dateCreated;

    /* -------------------- non-persistent helpers -------------------- */

    /** Mark “fabricated” memberships (e.g., system admin bypass) that aren’t persisted. */
    @Transient
    private boolean synthetic;

    /** Convenience ID getters (avoid lazy loads) */
    @Transient
    public UUID getOrganizationId() { return organization != null ? organization.getOrgId() : null; }
    @Transient
    public UUID getUserId()         { return user != null ? user.getUserId() : null; }


    /** System-admin role check used in AuthorizationService */
    @Transient
    public boolean isSystemAdmin() { return "SYSTEM_ADMIN".equalsIgnoreCase(this.roleName); }

    public boolean isSynthetic() { return synthetic; }
    public void setSynthetic(boolean synthetic) { this.synthetic = synthetic; }

    /** Factory: build a synthetic “system admin” membership for the current request context. */
    public static OrgMembership systemAdmin(UUID userId, UUID actingOrgId) {
        OrgMembership m = new OrgMembership();
        m.setRoleName("SYSTEM_ADMIN");
        m.setEnabled(true);
        m.setSynthetic(true);

        if (userId != null) {
            SystemUser u = new SystemUser();
            u.setUserId(userId);           // id-only stub
            m.setUser(u);
        }
        if (actingOrgId != null) {
            Organization o = new Organization();
            o.setOrgId(actingOrgId);       // id-only stub
            m.setOrganization(o);
        }
        return m;
    }


    // ---------------------------------------------------------------------
    // Equality: use primary key when available; fallback to business key
    // -------

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof OrgMembership that)) return false;

        if (membershipId != null && that.membershipId != null) {
            return membershipId.equals(that.membershipId);
        }
        // fallback: compare by business key (org_id, user_id) without initializing proxies
        return Objects.equals(getOrganizationId(), that.getOrganizationId()) &&
                Objects.equals(getUserId(), that.getUserId());
    }

    @Override
    public int hashCode() {
        if (membershipId != null) return membershipId.hashCode();
        return Objects.hash(getOrganizationId(), getUserId());
    }


    @Override
    public String toString() {
        // Avoid triggering lazy loads: print only IDs where possible
        UUID orgId = organization != null ? organization.getOrgId() : null;
        UUID userId = user != null ? user.getUserId() : null;
        return "OrgMembership{" +
                "membershipId=" + membershipId +
                ", orgId=" + orgId +
                ", userId=" + userId +
                ", roleName='" + roleName + '\'' +
                ", enabled=" + isEnabled +
                '}';
    }


}
