package election.ems_backend.dto;

import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class ReportSnapshotDto {

    // ========================================================================
    // SNAPSHOT
    // ========================================================================

    private UUID snapshotId;

    private UUID orgId;

    private UUID electionId;

    // ========================================================================
    // GEOGRAPHIC SCOPE
    // ========================================================================

    private UUID countyId;

    private UUID districtId;

    private UUID centerId;

    // ========================================================================
    // RESULT FILTERS
    // ========================================================================

    private UUID candidateId;

    private UUID partyId;

    // ========================================================================
    // REQUEST
    // ========================================================================

    private String requestedFormat;

    private String requestedBy;

    private OffsetDateTime requestedAt;

    // ========================================================================
    // STATUS
    // ========================================================================

    private String status;

    private String statusMessage;

    private OffsetDateTime expiresAt;

    private Integer retryCount;

    // ========================================================================
    // GENERATED FILE
    // ========================================================================

    private UUID fileId;
}