package election.ems_backend.service.implement;

import election.ems_backend.dto.DistrictDto;
import election.ems_backend.dto.DistrictRequest;
import election.ems_backend.entity.County;
import election.ems_backend.entity.District;
import election.ems_backend.mapper.DistrictMapper;
import election.ems_backend.repository.CountyRepository;
import election.ems_backend.repository.DistrictRepository;
import election.ems_backend.service.DistrictService;
import jakarta.persistence.EntityExistsException;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class DistrictServiceImplementation implements DistrictService {

    private final DistrictRepository districtRepo;
    private final CountyRepository countyRepository;
    private final DistrictMapper districtMapper = new DistrictMapper();

    @Override
    public DistrictDto create(DistrictRequest req) {
        County county = countyRepository.findById(req.countyId())
                .orElseThrow(() -> new EntityNotFoundException("County not found"));

        guardUnique(req.districtName(), county.getCountyId(), null);

        District d = districtMapper.toEntity(req, county);
        d = districtRepo.save(d);
        return districtMapper.toDTO(d);
    }

    @Override
    public DistrictDto update(UUID districtId, DistrictRequest req) {
        District d = districtRepo.findById(districtId)
                .orElseThrow(() -> new EntityNotFoundException("District not found"));

        County county = countyRepository.findById(req.countyId())
                .orElseThrow(() -> new EntityNotFoundException("County not found"));

        guardUnique(req.districtName(), county.getCountyId(), districtId);

        districtMapper.updateEntity(d, req, county);
        return districtMapper.toDTO(d);
    }

    @Override
    public void delete(UUID districtId) {
        if (!districtRepo.existsById(districtId))
            throw new EntityNotFoundException("District not found");
        districtRepo.deleteById(districtId);
    }

    @Override
    @Transactional(readOnly = true)
    public DistrictDto get(UUID districtId) {
        return districtRepo.findById(districtId)
                .map(districtMapper::toDTO)
                .orElseThrow(() -> new EntityNotFoundException("District not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DistrictDto> list(String q, UUID countyId, Pageable pageable) {
        Page<District> page;
        if (countyId != null && q != null && !q.isBlank()) {
            page = districtRepo.findByCounty_CountyIdAndDistrictNameContainingIgnoreCase(countyId, q.trim(), pageable);
        } else if (countyId != null) {
            page = districtRepo.findByCounty_CountyId(countyId, pageable);
        } else if (q != null && !q.isBlank()) {
            page = districtRepo.findByDistrictNameContainingIgnoreCase(q.trim(), pageable);
        } else {
            page = districtRepo.findAll(pageable);
        }
        return page.map(districtMapper::toDTO);
    }

    private void guardUnique(String name, UUID countyId, UUID selfId) {
        boolean exists = districtRepo.existsByDistrictNameIgnoreCaseAndCounty_CountyId(name.trim(), countyId);
        if (!exists) return;

        // If updating, allow same name if it belongs to this district
        if (selfId != null) {
            District current = districtRepo.findById(selfId).orElse(null);
            if (current != null
                    && current.getCounty() != null
                    && current.getCounty().getCountyId().equals(countyId)
                    && current.getDistrictName().equalsIgnoreCase(name)) {
                return;
            }
        }
        throw new EntityExistsException("District '" + name + "' already exists in this county");
    }

    @Override
    @Transactional(readOnly = true)
    public List<DistrictDto> listByCounty(UUID countyId) {
        var districts = districtRepo.findByCounty_CountyIdOrderByDistrictNameAsc(countyId);
        return districts.stream().map(districtMapper::toDTO).toList();
    }
}