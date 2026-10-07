package election.ems_backend.dto;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class VoterRegistrationStagingDto {
    private UUID stagingId;
    private UUID batchId;
    private String nationalId;
    private String fullName;
    private LocalDate dob;
    private String assignedCenterCode;
    private UUID importedBy;
    private LocalDateTime importTime;
    private Boolean validated;
    private String validationErrors;
    private UUID validatedBy;
    private LocalDateTime validatedAt;
    private Boolean processed;
    private UUID processedBy;
    private LocalDateTime processedAt;
    private UUID processedVoterId;
}
