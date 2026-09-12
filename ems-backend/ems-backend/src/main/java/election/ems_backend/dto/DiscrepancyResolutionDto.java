package election.ems_backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import election.ems_backend.enums.DiscrepancyResolutionAction;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
public class DiscrepancyResolutionDto {

    @NotNull(message = "Discrepancy ID is required")
    private UUID discrepancyId;

    @NotNull(message = "Resolution action is required")
    private DiscrepancyResolutionAction resolutionAction;

    @NotBlank(message = "Resolution notes are required")
    @Size(min = 10, max = 500, message = "Resolution notes must be between 10 and 500 characters")
    private String resolutionNotes;

    @JsonIgnore
    private UUID supervisorId;

    @JsonIgnore
    private LocalDateTime resolvedAt;
}