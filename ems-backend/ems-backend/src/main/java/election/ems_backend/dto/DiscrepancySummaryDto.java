package election.ems_backend.dto;

import election.ems_backend.enums.DiscrepancyReconciliationPhase;
import election.ems_backend.enums.DiscrepancySeverity;
import election.ems_backend.enums.DiscrepancyStatus;
import election.ems_backend.enums.DiscrepancyType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;



@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiscrepancySummaryDto {

    private UUID discId;
    private UUID submissionId;
    private DiscrepancyType discrepancyType;
    private DiscrepancyReconciliationPhase reconciliationPhase;
    private DiscrepancySeverity severity;
    private String fieldName;
    private String description;
    private DiscrepancyStatus status;
    private LocalDateTime createdAt;
    private Long daysSinceCreated;
}