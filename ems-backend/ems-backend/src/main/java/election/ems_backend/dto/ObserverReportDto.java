package election.ems_backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
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
public class ObserverReportDto {
    private UUID reportId;
    private UUID orgId;
    private String orgName;
    private UUID observerId;
    private String observerName;
    private UUID countyId;
    private String countyName;
    private UUID districtId;
    private String districtName;
    private UUID centerId;
    private String centerCode;
    private String centerName;
    private String type;
    private String description;
    private String visibility;
    private String verificationStatus;
    private UUID verifiedBy;
    private LocalDateTime verifiedAt;
    private String verificationNote;
    private String mediaUrl;
    private Double latitude;
    private Double longitude;  // extracted from Point
    private LocalDateTime timestamp;
    private Boolean isCritical;
    private Boolean resolved;
    private LocalDateTime resolvedAt;
    private UUID resolvedBy;
    private String resolvedNote;

}