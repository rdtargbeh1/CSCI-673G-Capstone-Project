package election.ems_backend.dto;

import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class ReportSnapshotDto {
    private UUID snapshotId;
    private UUID orgId;
    private UUID electionId;
    private String requestedFormat;
    private String requestedBy;
    private OffsetDateTime requestedAt;
    private String status;
    private String statusMessage;
    private UUID fileId;
}