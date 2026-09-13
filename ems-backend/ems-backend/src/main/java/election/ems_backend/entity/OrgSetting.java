package election.ems_backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;


import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;


/**
 * Per-tenant (Organization) settings stored as JSONB.
 *
 * <p>Key points:
 * <ul>
 *   <li>Primary key is the same as {@code organization.orgId} (via {@link MapsId}).</li>
 *   <li>Backed by PostgreSQL JSONB so you can add new flags/limits without schema changes.</li>
 *   <li>{@code settings} is never null; defaults to an empty map.</li>
 * </ul>
 *
 * <p>Typical keys (see {@code OrgSettingKeys}):
 * <ul>
 *   <li>{@code rate_limit_per_min} – per-tenant request throttle (int)</li>
 *   <li>{@code show_official} – toggle showing NEC official results alongside party tallies (boolean)</li>
 *   <li>{@code lockout_threshold} – failed-login attempts before lock (int)</li>
 *   <li>{@code lockout_minutes} – lock duration in minutes (int)</li>
 * </ul>
 */


@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder

@Entity
@Table(name = "org_setting")
public class OrgSetting {

    /**
     * PK == FK to Organization.orgId.
     *
     * <p>We generate the UUID to allow creating a settings row before the Organization is flushed,
     * but {@link MapsId} ensures the value mirrors the organization's id once linked.
     */
    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "org_id", updatable = false, nullable = false)
    private UUID orgId;

    /**
     * Owning organization (1:1). {@link MapsId} uses the same {@code org_id} for PK and FK.
     */
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "org_id", foreignKey = @ForeignKey(name = "fk_setting_org"))
    private Organization organization;

    /**
     * Arbitrary tenant settings stored as JSONB.
     *
     * <p>Hibernate will serialize the Map as JSON on write and deserialize on read.
     * Keep values simple (String/Number/Boolean/List/Map) for portability.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "settings", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> settings = new HashMap<>();

    /* ---------------------------- lifecycle ---------------------------- */

    @PrePersist
    void prePersist() {
        if (settings == null) settings = new HashMap<>();
    }

    /* ---------------------------- helpers ----------------------------- */

    /** Defensive getter – never returns null. */
    public Map<String, Object> getSettings() {
        if (settings == null) settings = new HashMap<>();
        return settings;
    }

    /** Replace settings entirely (never null). */
    public void setSettings(Map<String, Object> settings) {
        this.settings = (settings != null) ? new HashMap<>(settings) : new HashMap<>();
    }

    /** Idempotent put; removes key if value is null (keeps JSON clean). */
    public void put(String key, Object value) {
        if (value == null) {
            getSettings().remove(key);
        } else {
            getSettings().put(key, value);
        }
    }

    /** Merge provided map, skipping null values. */
    public void merge(Map<String, Object> updates) {
        if (updates == null) return;
        updates.forEach((k, v) -> { if (v != null) put(k, v); });
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof OrgSetting that)) return false;
        return Objects.equals(orgId, that.orgId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(orgId);
    }

    @Override
    public String toString() {
        return "OrgSetting{orgId=" + orgId + ", keys=" + getSettings().keySet() + "}";
    }

}
