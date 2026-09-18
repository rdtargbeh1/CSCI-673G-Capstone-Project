package election.ems_backend.service;

import election.ems_backend.dto.DistrictDto;
import election.ems_backend.dto.DistrictRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface DistrictService {
    DistrictDto create(DistrictRequest req);
    DistrictDto update(UUID districtId, DistrictRequest req);
    void delete(UUID districtId);

    DistrictDto get(UUID districtId);
    DistrictDto get(UUID districtId, UUID electionId);

    List<DistrictDto> listByCounty(UUID countyId);
    List<DistrictDto> listByCounty(UUID countyId, UUID electionId);

    Page<DistrictDto> list(String q, UUID countyId, Pageable pageable);
    Page<DistrictDto> list(String q, UUID countyId, UUID electionId, Pageable pageable);
}
