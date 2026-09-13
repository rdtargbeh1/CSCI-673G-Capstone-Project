package election.ems_backend.dto;

import java.util.UUID;

/** What we return to clients */
public record DistrictDto(
        UUID districtId,
        String districtName,
        UUID countyId,
        String countyName
) {}