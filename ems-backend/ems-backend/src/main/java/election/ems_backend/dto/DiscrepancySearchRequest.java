package election.ems_backend.dto;

import election.ems_backend.enums.DiscrepancyStatus;

import java.util.UUID;

public record DiscrepancySearchRequest(
        UUID electionId,
        UUID countyId,
        UUID districtId,
        UUID centerId,
        DiscrepancyStatus status
) {}
