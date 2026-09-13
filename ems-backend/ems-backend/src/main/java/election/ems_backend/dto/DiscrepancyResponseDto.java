package election.ems_backend.dto;

import election.ems_backend.enums.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;


@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiscrepancyResponseDto {

    private UUID discId;
    private UUID submissionId;
    private UUID electionId;
    private UUID placeId;
    private UUID centerId;
    private UUID orgId;
    private UUID contestId;
    private DiscrepancyType discrepancyType;
    private DiscrepancyReconciliationPhase reconciliationPhase;
    private DiscrepancySeverity severity;
    private DiscrepancyResolutionAction resolutionAction;
    private String fieldName;
    private String expectedValue;
    private String actualValue;
    private Integer delta;
    private String description;
    private Map<String, Object> details;
    private DiscrepancyStatus status;
    private String resolutionNotes;
    private UUID resolvedById;
    private String resolvedByName;
    private LocalDateTime resolvedAt;
    private UUID createdById;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}