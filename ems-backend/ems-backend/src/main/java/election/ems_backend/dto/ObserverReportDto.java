package election.ems_backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
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
    private String mediaUrl;
    private Double latitude;
    private Double longitude;  // extracted from Point
    private LocalDateTime timestamp;
    private Boolean resolved;
}