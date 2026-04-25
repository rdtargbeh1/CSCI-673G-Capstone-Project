package election.ems_backend.service;

import election.ems_backend.dto.PollingCenterCreateRequest;
import election.ems_backend.dto.PollingCenterDto;
import election.ems_backend.dto.PollingCenterUpdateRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface PollingCenterService {
    PollingCenterDto create(PollingCenterCreateRequest req);
    PollingCenterDto update(UUID id, PollingCenterUpdateRequest req);
    void delete(UUID id);
    PollingCenterDto get(UUID id);

    Page<PollingCenterDto> search(String q, UUID countyId, UUID districtId, Pageable pageable);
}