package election.ems_backend.dto;

import election.ems_backend.enums.DiscrepancyReconciliationPhase;
import election.ems_backend.enums.DiscrepancySeverity;
import election.ems_backend.enums.DiscrepancyType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiscrepancyRequestDto {

    @NotNull
    private UUID submissionId;

    @NotNull
    private DiscrepancyType discrepancyType;

    @NotNull
    private DiscrepancyReconciliationPhase reconciliationPhase;

    @NotNull
    private DiscrepancySeverity severity;

    private String fieldName;

    private String expectedValue;

    private String actualValue;

    private Integer delta;

    @NotBlank
    private String description;

    private Map<String, Object> details;
}