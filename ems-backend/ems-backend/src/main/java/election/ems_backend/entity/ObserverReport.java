package election.ems_backend.entity;

import election.ems_backend.enums.ObserverReportVerificationStatus;
import election.ems_backend.enums.ObserverReportVisibility;
import election.ems_backend.enums.ReportType;

import jakarta.persistence.*;

import lombok.*;

import org.hibernate.annotations.UuidGenerator;

import org.locationtech.jts.geom.Point;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder

@Entity
@Table(
        name = "observer_report",
        indexes = {
                @Index(name = "idx_obs_org", columnList = "org_id"),
                @Index(name = "idx_obs_election", columnList = "election_id"),
                @Index(name = "idx_obs_observer", columnList = "observer_id"),
                @Index(name = "idx_obs_county", columnList = "county_id"),
                @Index(name = "idx_obs_district", columnList = "district_id"),
                @Index(name = "idx_obs_center", columnList = "center_id"),
                @Index(name = "idx_obs_type", columnList = "type"),
                @Index(name = "idx_obs_resolved", columnList = "resolved"),
                @Index(name = "idx_obs_timestamp", columnList = "timestamp"),
                @Index(
                        name = "idx_obs_org_election",
                        columnList = "org_id,election_id"
                )
        }
)
public class ObserverReport extends AuditBaseEntity {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(
            name = "report_id",
            nullable = false,
            updatable = false
    )
    private UUID reportId;

    // ========================================================================
    // ORGANIZATION
    // ========================================================================

    @ManyToOne(
            fetch = FetchType.LAZY,
            optional = false
    )
    @JoinColumn(
            name = "org_id",
            nullable = false,
            foreignKey = @ForeignKey(
                    name = "fk_observer_report_org"
            )
    )
    private Organization organization;

    // ========================================================================
    // ELECTION
    // ========================================================================

    @ManyToOne(
            fetch = FetchType.LAZY,
            optional = false
    )
    @JoinColumn(
            name = "election_id",
            nullable = false,
            foreignKey = @ForeignKey(
                    name = "fk_observer_report_election"
            )
    )
    private Election election;

    // ========================================================================
    // OBSERVER
    // ========================================================================

    @ManyToOne(
            fetch = FetchType.LAZY,
            optional = false
    )
    @JoinColumn(
            name = "observer_id",
            nullable = false,
            foreignKey = @ForeignKey(
                    name = "fk_observer_report_observer"
            )
    )
    private SystemUser observer;

    // ========================================================================
    // GEOGRAPHY
    // ========================================================================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "county_id",
            foreignKey = @ForeignKey(
                    name = "fk_observer_report_county"
            )
    )
    private County county;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "district_id",
            foreignKey = @ForeignKey(
                    name = "fk_observer_report_district"
            )
    )
    private District district;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "center_id",
            foreignKey = @ForeignKey(
                    name = "fk_observer_report_center"
            )
    )
    private PollingCenter pollingCenter;

    // ========================================================================
    // REPORT
    // ========================================================================

    @Enumerated(EnumType.STRING)
    @Column(
            name = "type",
            length = 50,
            nullable = false
    )
    private ReportType type;

    @Column(
            name = "description",
            nullable = false,
            columnDefinition = "text"
    )
    private String description;

    // ========================================================================
    // VISIBILITY
    // ========================================================================

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(
            name = "visibility",
            nullable = false
    )
    private ObserverReportVisibility visibility =
            ObserverReportVisibility.PRIVATE;

    // ========================================================================
    // VERIFICATION
    // ========================================================================

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(
            name = "verification_status",
            nullable = false
    )
    private ObserverReportVerificationStatus verificationStatus =
            ObserverReportVerificationStatus.PENDING;

    @Column(name = "verified_by")
    private UUID verifiedBy;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Builder.Default
    @Column(
            name = "verification_note",
            nullable = false,
            columnDefinition = "text"
    )
    private String verificationNote = "";

    // ========================================================================
    // MEDIA / LOCATION
    // ========================================================================

    @Column(
            name = "media_url",
            columnDefinition = "text"
    )
    private String mediaUrl;

    @Column(
            name = "gps_location",
            columnDefinition = "geography(Point,4326)"
    )
    private Point gpsLocation;

    @Column(name = "timestamp")
    private LocalDateTime timestamp;

    // ========================================================================
    // INCIDENT STATE
    // ========================================================================

    @Builder.Default
    @Column(
            name = "is_critical",
            nullable = false
    )
    private Boolean isCritical = false;

    @Builder.Default
    @Column(
            name = "resolved",
            nullable = false
    )
    private Boolean resolved = false;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "resolved_by")
    private UUID resolvedBy;

    @Builder.Default
    @Column(
            name = "resolved_note",
            nullable = false,
            columnDefinition = "text"
    )
    private String resolvedNote = "";

    // ========================================================================
    // ENTITY CALLBACK
    // ========================================================================

    @PrePersist
    public void prePersist() {

        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }

        if (visibility == null) {
            visibility = ObserverReportVisibility.PRIVATE;
        }

        if (verificationStatus == null) {
            verificationStatus =
                    ObserverReportVerificationStatus.PENDING;
        }

        if (isCritical == null) {
            isCritical = false;
        }

        if (resolved == null) {
            resolved = false;
        }

        if (verificationNote == null) {
            verificationNote = "";
        }

        if (resolvedNote == null) {
            resolvedNote = "";
        }
    }
}