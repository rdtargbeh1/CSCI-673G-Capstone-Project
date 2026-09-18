package election.ems_backend.service;

import election.ems_backend.dto.PollingPlaceBulkCreateRequest;
import election.ems_backend.dto.PollingPlaceCreateRequest;
import election.ems_backend.dto.PollingPlaceDto;
import election.ems_backend.dto.PollingPlaceUpdateRequest;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.UUID;

public interface PollingPlaceService {
    PollingPlaceDto create(PollingPlaceCreateRequest req);
    List<PollingPlaceDto> createBulk(PollingPlaceBulkCreateRequest req);
    PollingPlaceDto update(UUID id, PollingPlaceUpdateRequest req);

    PollingPlaceDto get(UUID id);
    PollingPlaceDto get(UUID id, UUID electionId);

    List<PollingPlaceDto> listByCenter(UUID centerId);
    List<PollingPlaceDto> listByCenter(UUID centerId, UUID electionId);

    PollingPlaceDto setActive(UUID id, boolean active);
    void delete(UUID id);

    Page<PollingPlaceDto> list(int page, int size, String q,
                               UUID countyId, UUID districtId, UUID centerId,
                               Boolean active);

    Page<PollingPlaceDto> list(int page, int size, String q,
                               UUID countyId, UUID districtId, UUID centerId,
                               Boolean active, UUID electionId);
}
