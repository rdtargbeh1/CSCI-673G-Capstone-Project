package election.ems_backend.service.implement;

import election.ems_backend.dto.PollingPlaceBulkCreateRequest;
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
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class PollingPlaceServiceImplementation implements PollingPlaceService {

    private final PollingPlaceRepository pollingPlaceRepository;
    private final PollingCenterRepository centerRepo;

    private final PollingPlaceMapper mapper = new PollingPlaceMapper();

    // ========================================================================
    // CREATE
    // ========================================================================

    @Override
    @Transactional
    public PollingPlaceDto create(
            PollingPlaceCreateRequest req
    ) {

        PollingCenter center =
                centerRepo
                        .findById(
                                req.getCenterId()
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        NOT_FOUND,
                                        "Polling center not found"
                                )
                        );

        District district =
                center.getDistrict();

        if (district == null) {

            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Polling center is not linked to a district"
            );
        }

        List<PollingPlace> existing =
                pollingPlaceRepository
                        .findByPollingCenter_CenterIdOrderByPlaceNumberAsc(
                                center.getCenterId()
                        );

        int nextNumber =
                existing.isEmpty()
                        ? 1
                        : existing
                        .get(existing.size() - 1)
                        .getPlaceNumber() + 1;

        String code =
                generateUniquePlaceCode(
                        district,
                        center
                );

        PollingPlace entity =
                mapper.toEntity(
                        req,
                        center,
                        nextNumber,
                        code
                );

        PollingPlace saved =
                pollingPlaceRepository
                        .save(
                                entity
                        );

        return mapper.toDTO(
                saved
        );
    }

    // ========================================================================
    // BULK CREATE
    // ========================================================================

    @Override
    @Transactional
    public List<PollingPlaceDto> createBulk(
            PollingPlaceBulkCreateRequest req
    ) {

        PollingCenter center =
                centerRepo
                        .findById(
                                req.getCenterId()
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        NOT_FOUND,
                                        "Polling center not found"
                                )
                        );

        District district =
                center.getDistrict();

        if (district == null) {

            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Polling center is not linked to a district"
            );
        }

        String prefix =
                req.getLabelPrefix()
                        .trim();

        List<PollingPlace> existing =
                pollingPlaceRepository
                        .findByPollingCenter_CenterIdOrderByPlaceNumberAsc(
                                center.getCenterId()
                        );

        int nextNumber =
                existing.isEmpty()
                        ? 1
                        : existing
                        .get(existing.size() - 1)
                        .getPlaceNumber() + 1;

        List<PollingPlace> places =
                new ArrayList<>();

        for (
                int offset = 0;
                offset < req.getQuantity();
                offset++
        ) {

            int placeNumber =
                    nextNumber + offset;

            String label =
                    prefix
                            + " "
                            + String.format(
                            "%02d",
                            placeNumber
                    );

            String code =
                    generateUniquePlaceCode(
                            district,
                            center
                    );

            PollingPlace place =
                    PollingPlace
                            .builder()
                            .pollingCenter(
                                    center
                            )
                            .placeNumber(
                                    placeNumber
                            )
                            .code(
                                    code
                            )
                            .label(
                                    label
                            )
                            .active(
                                    true
                            )
                            .build();

            places.add(
                    place
            );
        }

        return pollingPlaceRepository
                .saveAll(
                        places
                )
                .stream()
                .map(
                        mapper::toDTO
                )
                .toList();
    }

    // ========================================================================
    // UPDATE
    // ========================================================================

    @Override
    @Transactional
    public PollingPlaceDto update(
            UUID id,
            PollingPlaceUpdateRequest req
    ) {

        PollingPlace place =
                pollingPlaceRepository
                        .findById(
                                id
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        NOT_FOUND,
                                        "Polling place not found"
                                )
                        );

        String label =
                req.getLabel();

        if (label != null) {

            label =
                    label.trim();

            if (label.isBlank()) {
                label = null;
            }
        }

        place.setLabel(
                label
        );

        if (req.getActive() != null) {

            place.setActive(
                    req.getActive()
            );
        }

        PollingPlace saved =
                pollingPlaceRepository
                        .save(
                                place
                        );

        return mapper.toDTO(
                saved
        );
    }

    // ========================================================================
    // GENERATE UNIQUE PLACE CODE
    // ========================================================================

    private String generateUniquePlaceCode(
            District district,
            PollingCenter center
    ) {

        int maxAttempts = 5;

        for (
                int i = 0;
                i < maxAttempts;
                i++
        ) {

            String candidate =
                    PollingPlaceCodeGenerator
                            .generateCode(
                                    district,
                                    center
                            );

            if (
                    pollingPlaceRepository
                            .findByCode(
                                    candidate
                            )
                            .isEmpty()
            ) {

                return candidate;
            }
        }

        throw new ResponseStatusException(
                CONFLICT,
                "Failed to generate unique polling place code after several attempts"
        );
    }

    // ========================================================================
    // GET
    //
    // PollingPlace is global geography reference data.
    // It is not owned by an Election.
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public PollingPlaceDto get(
            UUID id
    ) {

        PollingPlace place =
                pollingPlaceRepository
                        .findById(
                                id
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        NOT_FOUND,
                                        "Polling place not found"
                                )
                        );

        return mapper.toDTO(
                place
        );
    }

    // ========================================================================
    // GET - COMPATIBILITY OVERLOAD
    //
    // Preserve the existing interface/controller contract.
    // electionId is intentionally ignored because PollingPlace is global
    // geography reference data.
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public PollingPlaceDto get(
            UUID id,
            UUID electionId
    ) {

        return get(
                id
        );
    }

    // ========================================================================
    // LIST BY CENTER
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<PollingPlaceDto> listByCenter(
            UUID centerId
    ) {

        return pollingPlaceRepository
                .findByPollingCenter_CenterIdOrderByPlaceNumberAsc(
                        centerId
                )
                .stream()
                .map(
                        mapper::toDTO
                )
                .toList();
    }

    // ========================================================================
    // LIST BY CENTER - COMPATIBILITY OVERLOAD
    //
    // electionId is intentionally ignored.
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<PollingPlaceDto> listByCenter(
            UUID centerId,
            UUID electionId
    ) {

        return listByCenter(
                centerId
        );
    }

    // ========================================================================
    // SET ACTIVE
    // ========================================================================

    @Override
    @Transactional
    public PollingPlaceDto setActive(
            UUID id,
            boolean active
    ) {

        PollingPlace place =
                pollingPlaceRepository
                        .findById(
                                id
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        NOT_FOUND,
                                        "Polling place not found"
                                )
                        );

        place.setActive(
                active
        );

        PollingPlace saved =
                pollingPlaceRepository
                        .save(
                                place
                        );

        return mapper.toDTO(
                saved
        );
    }

    // ========================================================================
    // DELETE
    // ========================================================================

    @Override
    @Transactional
    public void delete(
            UUID id
    ) {

        PollingPlace place =
                pollingPlaceRepository
                        .findById(
                                id
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        NOT_FOUND,
                                        "Polling place not found"
                                )
                        );

        UUID centerId =
                place
                        .getPollingCenter()
                        .getCenterId();

        pollingPlaceRepository
                .delete(
                        place
                );

        resequencePlaceNumbers(
                centerId
        );
    }

    // ========================================================================
    // RESEQUENCE PLACE NUMBERS
    // ========================================================================

    private void resequencePlaceNumbers(
            UUID centerId
    ) {

        List<PollingPlace> places =
                pollingPlaceRepository
                        .findByPollingCenter_CenterIdOrderByPlaceNumberAsc(
                                centerId
                        );

        int sequence = 1;

        for (
                PollingPlace place : places
        ) {

            if (
                    place.getPlaceNumber() == null
                            ||
                            place.getPlaceNumber() != sequence
            ) {

                place.setPlaceNumber(
                        sequence
                );
            }

            sequence++;
        }

        pollingPlaceRepository
                .saveAll(
                        places
                );
    }

    // ========================================================================
    // LIST
    // ========================================================================

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

        Pageable pageable =
                PageRequest.of(
                        page,
                        size,
                        Sort.by(
                                        "pollingCenter.centerName"
                                )
                                .ascending()
                                .and(
                                        Sort.by(
                                                        "placeNumber"
                                                )
                                                .ascending()
                                )
                );

        Specification<PollingPlace> spec =
                PollingPlaceSpecs.filter(
                        q,
                        countyId,
                        districtId,
                        centerId,
                        active
                );

        return pollingPlaceRepository
                .findAll(
                        spec,
                        pageable
                )
                .map(
                        mapper::toDTO
                );
    }

    // ========================================================================
    // LIST - COMPATIBILITY OVERLOAD
    //
    // Preserve callers that still pass electionId.
    // electionId is intentionally ignored because PollingPlace itself is not
    // election-scoped.
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public Page<PollingPlaceDto> list(
            int page,
            int size,
            String q,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            Boolean active,
            UUID electionId
    ) {

        return list(
                page,
                size,
                q,
                countyId,
                districtId,
                centerId,
                active
        );
    }
}
