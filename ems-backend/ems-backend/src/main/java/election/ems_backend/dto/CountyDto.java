package election.ems_backend.dto;

import java.util.UUID;

public record CountyDto(
        UUID countyId,
        String countyName
) {}