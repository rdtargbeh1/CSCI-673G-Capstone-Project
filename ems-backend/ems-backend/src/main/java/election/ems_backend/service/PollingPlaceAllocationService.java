package election.ems_backend.service;

import election.ems_backend.dto.PollingPlaceAllocationCreateRequest;
import election.ems_backend.dto.PollingPlaceAllocationDto;
import election.ems_backend.dto.PollingPlaceAllocationUpdateRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface PollingPlaceAllocationService {

    PollingPlaceAllocationDto create(PollingPlaceAllocationCreateRequest req);

    PollingPlaceAllocationDto update(UUID id, PollingPlaceAllocationUpdateRequest req);

    void delete(UUID id);

    PollingPlaceAllocationDto get(UUID id);

    Page<PollingPlaceAllocationDto> search(UUID electionId, UUID centerId, UUID placeId, Pageable pageable);
}
