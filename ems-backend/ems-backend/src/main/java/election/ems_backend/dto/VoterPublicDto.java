package election.ems_backend.dto;

import election.ems_backend.enums.RegistrationStatus;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class VoterPublicDto {
    private UUID voterId;          // internal UUID
    private String voterCardId;    // NEC-assigned card id (string) for external display
    private UUID electionId;
    private String fullName;
    private String pictureUrl;
    private UUID countyId;
    private UUID districtId;
    private UUID assignedCenterId;
    private String pollingPlace;
    private RegistrationStatus registrationStatus;
    private LocalDateTime datePublished;
}