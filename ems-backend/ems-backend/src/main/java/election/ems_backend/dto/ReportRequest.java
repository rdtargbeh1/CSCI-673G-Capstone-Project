package election.ems_backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.util.UUID;

@Data
public class ReportRequest {

    @NotNull(message = "electionId is required")
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
    // OUTPUT FORMAT
    // ========================================================================

    /**
     * Supported:
     *
     * CSV
     * XLSX
     * PDF
     *
     * Null may still default to CSV in the service.
     */
    @Pattern(
            regexp = "(?i)CSV|XLSX|PDF",
            message = "format must be CSV, XLSX, or PDF"
    )
    private String format;
}