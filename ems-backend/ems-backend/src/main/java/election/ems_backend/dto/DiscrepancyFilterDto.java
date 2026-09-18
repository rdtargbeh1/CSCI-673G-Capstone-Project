package election.ems_backend.dto;


import election.ems_backend.enums.*;
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
public class DiscrepancyFilterDto {

    private UUID electionId;
    private UUID centerId;
    private UUID placeId;
    private DiscrepancyType discrepancyType;
    private DiscrepancyReconciliationPhase reconciliationPhase;
    private DiscrepancySeverity severity;
    private DiscrepancyResolutionAction resolutionAction;
    private DiscrepancyStatus status;
    private LocalDateTime createdFromDate;
    private LocalDateTime createdToDate;
    private Integer pageNumber = 0;
    private Integer pageSize = 20;
    private String sortBy = "createdAt";
    private String sortDirection = "DESC";

}