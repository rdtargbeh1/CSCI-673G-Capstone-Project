package election.ems_backend.entity;


import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Report request snapshot entity.
 */
@Entity
@Table(name = "report_snapshot")
@Getter
@Setter
@NoArgsConstructor
public class ReportSnapshot {

    @Id
    @Column(name = "snapshot_id", nullable = false)
    private UUID snapshotId;

    @Column(name = "org_id", nullable = false)
    private UUID orgId;

    @Column(name = "election_id", nullable = false)
    private UUID electionId;

    @Column(name = "county_id")
    private UUID countyId;

    @Column(name = "district_id")
    private UUID districtId;

    @Column(name = "center_id")
    private UUID centerId;

    @Column(name = "candidate_id")
    private UUID candidateId;

    @Column(name = "party_id")
    private UUID partyId;

    @Column(name = "filters", columnDefinition = "jsonb")
    private String filters;

    @Column(name = "requested_format")
    private String requestedFormat;

    @Column(name = "requested_by")
    private String requestedBy;

    @Column(name = "requested_at")
    private OffsetDateTime requestedAt;

    @Column(name = "status")
    private String status;

    @Column(name = "status_message")
    private String statusMessage;

    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;

    @Column(name = "retry_count")
    private Integer retryCount;
}