package election.ems_backend.service.implement;

import election.ems_backend.dto.PollingCenterCreateRequest;
import election.ems_backend.dto.PollingCenterDto;
import election.ems_backend.dto.PollingCenterUpdateRequest;
import election.ems_backend.entity.District;
import election.ems_backend.entity.PollingCenter;
import election.ems_backend.mapper.PollingCenterMapper;
import election.ems_backend.repository.DistrictRepository;
import election.ems_backend.repository.PollingCenterRepository;
import election.ems_backend.service.PollingCenterService;
import election.ems_backend.utility.PollingCenterCodeGenerator;
import election.ems_backend.utility.PollingCenterSpecs;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.springframework.http.HttpStatus.*;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class PollingCenterServiceImplementation implements PollingCenterService {

    private final PollingCenterRepository pollingCenterRepository;
    private final DistrictRepository districtRepository;
    private final PollingCenterMapper mapper = new PollingCenterMapper();


    @Override
    @Transactional
    public PollingCenterDto create(PollingCenterCreateRequest req) {

        // 1) Ensure district exists
        District district = districtRepository.findById(req.getDistrictId())
                .orElseThrow(() -> new IllegalArgumentException("District not found"));

        // 2) Generate a unique code (retry a few times just in case)
        String code = generateUniqueCenterCode(district);

        // 3) Map & build entity
        PollingCenter entity = PollingCenter.builder()
                .centerName(req.getCenterName())
//                .registeredVoters(req.getRegisteredVoters())
                .district(district)
                .code(code)
                .build();

        try {
            PollingCenter saved = pollingCenterRepository.save(entity);
            return mapper.toDTO(saved);
        } catch (DataIntegrityViolationException e) {
            // If some race condition still happens with UNIQUE(code)
            throw new IllegalStateException("Could not create polling center – code conflict", e);
        }
    }

    private String generateUniqueCenterCode(District district) {
        int maxAttempts = 5;
        for (int i = 0; i < maxAttempts; i++) {
            String candidate = PollingCenterCodeGenerator.generateCode(district);
            if (!pollingCenterRepository.existsByCodeIgnoreCase(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Failed to generate unique polling center code after several attempts");
    }


    @Override
    public PollingCenterDto update(UUID id, PollingCenterUpdateRequest req) {
        PollingCenter entity = pollingCenterRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Polling center not found"));

        // if code is changing, enforce uniqueness
        if (req.getCode() != null && !req.getCode().equalsIgnoreCase(entity.getCode())
                && pollingCenterRepository.existsByCodeIgnoreCase(req.getCode())) {
            throw new ResponseStatusException(CONFLICT, "Polling center code already exists");
        }
        if (req.getRegisteredVoters() != null && req.getRegisteredVoters() < 0) {
            throw new ResponseStatusException(BAD_REQUEST, "registeredVoters cannot be negative");
        }

        District newDistrict = null;
        if (req.getDistrictId() != null) {
            newDistrict = districtRepository.findById(req.getDistrictId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "District not found"));
        }

        mapper.apply(req, entity, newDistrict);
        return mapper.toDTO(pollingCenterRepository.save(entity));
    }

    @Override
    public void delete(UUID id) {
        // (Optional) Protect if referenced by results/allocations
        // Consider soft-delete or check foreign key refs if needed.
        if (!pollingCenterRepository.existsById(id)) throw new ResponseStatusException(NOT_FOUND, "Polling center not found");
        pollingCenterRepository.deleteById(id);
    }

    @Override
    public PollingCenterDto get(UUID id) {
        return pollingCenterRepository.findById(id).map(mapper::toDTO)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Polling center not found"));
    }

    @Override
    public Page<PollingCenterDto> search(String q, UUID countyId, UUID districtId, Pageable pageable) {
        Specification<PollingCenter> spec = Specification
                .where(PollingCenterSpecs.textContains(q))
                .and(PollingCenterSpecs.countyEquals(countyId))
                .and(PollingCenterSpecs.districtEquals(districtId));

        return pollingCenterRepository.findAll(spec, pageable).map(mapper::toDTO);
    }
}
