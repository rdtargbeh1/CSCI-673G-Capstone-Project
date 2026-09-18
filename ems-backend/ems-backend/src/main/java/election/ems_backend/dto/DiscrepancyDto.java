package election.ems_backend.dto;

import election.ems_backend.enums.DiscrepancyStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class DiscrepancyDto {
    private UUID discId;
    private UUID electionId;
    private UUID centerId;
    private String centerCode;
    private String centerName;
    private UUID districtId;
    private String districtName;
    private UUID countyId;
    private String countyName;

    private UUID orgId; // nullable
    private Integer partyValid;
    private Integer officialValid;
    private Integer partyInvalid;
    private Integer officialInvalid;
    private Integer deltaValid;   // computed
    private Integer deltaInvalid; // computed
    private DiscrepancyStatus status;
    private LocalDateTime notedAt;
}
