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
                @Index(name = "idx_obs_observer", columnList = "observer_id"),
                @Index(name = "idx_obs_county", columnList = "county_id"),
                @Index(name = "idx_obs_center", columnList = "center_id"),
                @Index(name = "idx_obs_type", columnList = "type"),
                @Index(name = "idx_obs_resolved", columnList = "resolved"),
                @Index(name = "idx_obs_timestamp", columnList = "timestamp")
        }
)
public class ObserverReport extends AuditBaseEntity {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(name = "report_id", nullable = false, updatable = false)
    private UUID reportId;

    @ManyToOne(fetch = FetchType.LAZY,  optional = false)
    @JoinColumn(name = "org_id", nullable = false,
            foreignKey = @ForeignKey(name = "observer_report_org_id_fkey"))
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY,  optional = false)
    @JoinColumn(name = "observer_id", nullable = false,
            foreignKey = @ForeignKey(name = "observer_report_observer_id_fkey"))
    private SystemUser observer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "county_id",
            foreignKey = @ForeignKey(name = "observer_report_county_id_fkey"))
    private County county;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "district_id",
            foreignKey = @ForeignKey(name = "fk_center_district"))
    private District district;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "center_id",
            foreignKey = @ForeignKey(name = "observer_report_center_id_fkey"))
    private PollingCenter pollingCenter;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", length = 50, nullable = false)
    private ReportType type;

    @Column(name = "description", nullable = false, columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false)
    private ObserverReportVisibility visibility = ObserverReportVisibility.PRIVATE;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false)
    private ObserverReportVerificationStatus verificationStatus = ObserverReportVerificationStatus.PENDING;

    @Column(name = "verified_by")
    private UUID verifiedBy;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "verification_note", columnDefinition = "text", nullable = false)
    private String verificationNote;


    @Column(name = "media_url", columnDefinition = "text")
    private String mediaUrl;

    // PostGIS location (GPS coordinates)
    @Column(name = "gps_location", columnDefinition = "geography(Point,4326)")
    private Point gpsLocation;

    @Column(name = "timestamp")
    private LocalDateTime timestamp = LocalDateTime.now();

    @Column(name = "is_critical", nullable = false)
    private Boolean isCritical = false;

    @Column(name = "resolved", nullable = false)
    private Boolean resolved = false;


    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "resolved_by")
    private UUID resolvedBy;

    @Column(name = "resolved_note", nullable = false, columnDefinition = "text")
    private String resolvedNote;


    @PrePersist
    public void prePersist() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }

}

