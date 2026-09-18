package election.ems_backend.service;

import election.ems_backend.dto.CountyDto;
import election.ems_backend.dto.CountyRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface CountyService {
    CountyDto create(CountyRequest req);
    CountyDto update(UUID countyId, CountyRequest req);
    void delete(UUID countyId);

    CountyDto get(UUID countyId);
    CountyDto get(UUID countyId, UUID electionId);

    Page<CountyDto> list(String q, Pageable pageable);
    Page<CountyDto> list(String q, UUID electionId, Pageable pageable);
}
