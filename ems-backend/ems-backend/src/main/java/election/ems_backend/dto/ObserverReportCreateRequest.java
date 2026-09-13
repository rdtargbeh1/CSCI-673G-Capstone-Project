package election.ems_backend.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
public class ObserverReportCreateRequest {
    @NotNull
    private UUID orgId;
    @NotNull private UUID observerId;

    // Either countyId or centerId (center implies county)
    private UUID countyId;
    private UUID districtId;
    private UUID centerId;

    @NotBlank
    private String type;       // ReportType name
    @NotBlank private String description;
    private String mediaUrl;

    // Optional GPS
    @DecimalMin(value="-90.0") @DecimalMax(value="90.0")
    private Double latitude;
    @DecimalMin(value="-180.0") @DecimalMax(value="180.0")
    private Double longitude;

    private LocalDateTime timestamp;     // optional, default now()
}