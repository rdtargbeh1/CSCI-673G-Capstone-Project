package election.ems_backend.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class PollingPlaceDto {

    // Place
    private UUID placeId;
    private Integer placeNumber;
    private String code;
    private String label;

    private UUID centerId;
    private String centerName;
    private String centerCode;

    // District
    private UUID districtId;
    private String districtName;

    // County
    private UUID countyId;
    private String countyName;

    private boolean active;

}