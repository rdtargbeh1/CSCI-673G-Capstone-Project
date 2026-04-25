package election.ems_backend.service;

import election.ems_backend.dto.PollingCenterAllocationCreateRequest;
import election.ems_backend.dto.PollingCenterAllocationDto;
import election.ems_backend.dto.PollingCenterAllocationUpdateRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface PollingCenterAllocationService {
    PollingCenterAllocationDto create(PollingCenterAllocationCreateRequest req);
    PollingCenterAllocationDto update(UUID id, PollingCenterAllocationUpdateRequest req);
    void delete(UUID id);
    PollingCenterAllocationDto get(UUID id);
    Page<PollingCenterAllocationDto> search(UUID electionId, UUID countyId, UUID districtId, UUID centerId, Pageable pageable);
}