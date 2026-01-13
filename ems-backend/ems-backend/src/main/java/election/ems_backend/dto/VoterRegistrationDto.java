package election.ems_backend.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class VoterRegistrationDto {
    private UUID voterId;
    private UUID assignedCenterId;   // use assignedCenterId consistently
    private UUID countyId;
    private UUID districtId;
    private String pollingPlace;
    private UUID electionId;
    private Double geoLat;
    private Double geoLon;
    private UUID registeredBy;
    private String registrationSource;
    private LocalDateTime effectiveFrom;
    private LocalDateTime effectiveTo;
    private String lookupHash;
    private LocalDateTime dateRegistered;
    private LocalDateTime dateUpdated;
    private String registrationStatus;
    private String voterCardId;      // NEC-assigned human-readable id (optional)
    private String pictureUrl;       // internal picture reference (NEC-only view)
}