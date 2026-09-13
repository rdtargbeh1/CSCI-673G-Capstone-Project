package election.ems_backend.service.implement;

import election.ems_backend.dto.PollingPlaceCreateRequest;
import election.ems_backend.dto.PollingPlaceDto;
import election.ems_backend.dto.PollingPlaceUpdateRequest;
import election.ems_backend.entity.District;
import election.ems_backend.entity.PollingCenter;
import election.ems_backend.entity.PollingPlace;
import election.ems_backend.mapper.PollingPlaceMapper;
import election.ems_backend.repository.PollingCenterRepository;
import election.ems_backend.repository.PollingPlaceRepository;
import election.ems_backend.service.PollingPlaceService;
import election.ems_backend.utility.PollingPlaceCodeGenerator;
import election.ems_backend.utility.PollingPlaceSpecs;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

import static org.springframework.http.HttpStatus.*;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class PollingPlaceServiceImplementation implements PollingPlaceService {

    private final PollingPlaceRepository pollingPlaceRepository;
    private final PollingCenterRepository centerRepo;
    private final PollingPlaceMapper mapper = new PollingPlaceMapper();

    // ---------------------------------------------------------------------
    // CREATE: auto-generate placeNumber + place code
    // ---------------------------------------------------------------------
    @Override
    @Transactional
    public PollingPlaceDto create(PollingPlaceCreateRequest req) {
        // 1) Load center
        PollingCenter center = centerRepo.findById(req.getCenterId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Polling center not found"));

        // 2) District needed for code generation
        District district = center.getDistrict();
        if (district == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Polling center is not linked to a district");
        }

        // 3) Determine next placeNumber inside this center (1, 2, 3, ...)
        List<PollingPlace> existing =
                pollingPlaceRepository.findByPollingCenter_CenterIdOrderByPlaceNumberAsc(center.getCenterId());

        int nextNumber = existing.isEmpty()
                ? 1
                : existing.get(existing.size() - 1).getPlaceNumber() + 1;

        // 4) Generate unique place code: PP-DDD-CCC-RRRRR
        String code = generateUniquePlaceCode(district, center);

        // 5) Build & save entity
        PollingPlace entity = mapper.toEntity(req, center, nextNumber, code);
        PollingPlace saved = pollingPlaceRepository.save(entity);

        return mapper.toDTO(saved);
    }

    @Override
    @Transactional
    public PollingPlaceDto update(UUID id, PollingPlaceUpdateRequest req) {
        PollingPlace place = pollingPlaceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Polling place not found: " + id));

        // ✅ Only allow updating the human label. Everything else is immutable.
        String label = req.getLabel();
        if (label != null) {
            label = label.trim();
            if (label.isBlank()) label = null;
        }
        place.setLabel(label);
        if (req.getActive() != null) place.setActive(req.getActive());

        // save (safe even if JPA dirty-checking would persist automatically)
        PollingPlace saved = pollingPlaceRepository.save(place);

        return mapper.toDTO(saved);
    }


    /**
     * Generate a unique polling place code using district + center name.
     * Uses PollingPlaceCodeGenerator and checks DB collisions up to a few times.
     */
    private String generateUniquePlaceCode(District district, PollingCenter center) {
        int maxAttempts = 5;
        for (int i = 0; i < maxAttempts; i++) {
            String candidate = PollingPlaceCodeGenerator.generateCode(district, center);
            if (pollingPlaceRepository.findByCode(candidate).isEmpty()) {
                return candidate;
            }
        }
        throw new ResponseStatusException(
                CONFLICT,
                "Failed to generate unique polling place code after several attempts"
        );
    }

    // ---------------------------------------------------------------------
    // GET BY ID
    // ---------------------------------------------------------------------
    @Override
    @Transactional(readOnly = true)
    public PollingPlaceDto get(UUID id) {
        return pollingPlaceRepository.findById(id)
                .map(mapper::toDTO)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Polling place not found"));
    }

    // ---------------------------------------------------------------------
    // LIST BY CENTER
    // ---------------------------------------------------------------------
    @Override
    @Transactional(readOnly = true)
    public List<PollingPlaceDto> listByCenter(UUID centerId) {
        return pollingPlaceRepository.findByPollingCenter_CenterIdOrderByPlaceNumberAsc(centerId)
                .stream()
                .map(mapper::toDTO)
                .toList();
    }


    @Override
    @Transactional
    public PollingPlaceDto setActive(UUID id, boolean active) {
        PollingPlace p = pollingPlaceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Polling place not found"));

        p.setActive(active);

        PollingPlace saved = pollingPlaceRepository.save(p);
        return mapper.toDTO(saved);
    }

    // ---------------------------------------------------------------------
    // DELETE (hard delete) + resequence placeNumber
    // ---------------------------------------------------------------------
    @Transactional
    public void delete(UUID id) {
        PollingPlace p = pollingPlaceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Polling place not found"));

        UUID centerId = p.getPollingCenter().getCenterId();
        pollingPlaceRepository.delete(p);

        // After deleting/merging, re-sequence placeNumber for remaining places (1,2,3,...)
        resequencePlaceNumbers(centerId);
    }

    /**
     * Re-orders placeNumber for all places in the center so they are:
     * 1, 2, 3, ...
     * <p>
     * NOTE:
     * - We do NOT change 'code' here. Codes remain stable so that historical
     * references on tally sheets / NEC exports remain valid.
     * - Currently this includes both active and inactive places. If you only
     * want active places numbered, filter by place.isActive().
     */
    private void resequencePlaceNumbers(UUID centerId) {
        List<PollingPlace> places = pollingPlaceRepository.findByPollingCenter_CenterIdOrderByPlaceNumberAsc(centerId);

        int seq = 1;
        for (PollingPlace place : places) {
            // If you want to skip inactive places, uncomment:
            // if (!place.isActive()) continue;

            if (place.getPlaceNumber() == null || place.getPlaceNumber() != seq) {
                place.setPlaceNumber(seq);
            }
            seq++;
        }

        pollingPlaceRepository.saveAll(places);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PollingPlaceDto> list(
            int page,
            int size,
            String q,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            Boolean active
    ) {
        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by("pollingCenter.centerName").ascending()
                        .and(Sort.by("placeNumber").ascending())
        );

        return pollingPlaceRepository
                .findAll(
                        PollingPlaceSpecs.filter(
                                q, countyId, districtId, centerId, active
                        ),
                        pageable
                )
                .map(mapper::toDTO);
    }


}