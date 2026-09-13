package election.ems_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record DistrictRequest(
        @NotBlank(message = "District name is required")
        @Size(max = 50, message = "District name must not exceed 50 characters")
        String districtName,

        @NotNull(message = "countyId is required")
        UUID countyId
) {}