package election.ems_backend.dto;

import lombok.Data;

import java.time.LocalDate;

/**
 * Request DTO for submitting a single staging row (e.g., from CSV parser or API).
 */
@Data
public class VoterRegistrationStagingCreateRequest {

    private String nationalId;
    private String fullName;
    private LocalDate dob;
    private String assignedCenterCode;
    private String importedByUserId; // optional string representation o
}
