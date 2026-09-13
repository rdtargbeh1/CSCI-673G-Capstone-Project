package election.ems_backend.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
public class ObserverReportUpdateRequest {
    private UUID countyId;            // nullable
    private UUID districtId;
    private UUID centerId;            // nullable
    private String type;              // nullable (ReportType)
    private String description;       // nullable
    private String mediaUrl;          // nullable
    private Double latitude;          // nullable
    private Double longitude;         // nullable
    private LocalDateTime timestamp;  // nullable
    private Boolean resolved;         // nullable
}