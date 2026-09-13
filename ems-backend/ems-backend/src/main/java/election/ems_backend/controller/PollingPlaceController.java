package election.ems_backend.controller;

import election.ems_backend.dto.PollingPlaceCreateRequest;
import election.ems_backend.dto.PollingPlaceDto;
import election.ems_backend.dto.PollingPlaceUpdateRequest;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.service.PollingPlaceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/polling-places")
@RequiredArgsConstructor
public class PollingPlaceController {

    private final AuthorizationService authz;
    private final PollingPlaceService pollingPlaceService;

    /**
     * Create a new polling place under a given center.
     *
     * - placeNumber is auto-generated (1,2,3,...) per center
     * - place code is auto-generated (PP-DDD-CCC-RAND5)
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PollingPlaceDto create(@Valid @RequestBody PollingPlaceCreateRequest req) {
        authz.requireNecAdminOrPlatformAdmin();
        return pollingPlaceService.create(req);
    }

    @PutMapping("/{id}")
    public PollingPlaceDto update(@PathVariable UUID id,
                                  @Valid @RequestBody PollingPlaceUpdateRequest req) {
        authz.requireNecAdminOrPlatformAdmin(); /// (SYSTEM/NEC)
        return pollingPlaceService.update(id, req);
    }

    /**
     * Get a single polling place by its ID.
     */
    @GetMapping("/{id}")
    public PollingPlaceDto get(@PathVariable("id") UUID id) {
        return pollingPlaceService.get(id);
    }

    /**
     * List all polling places for a specific center, ordered by placeNumber.
     *
     * Example:
     *   GET /api/polling-places/by-center/{centerId}
     */
    @GetMapping("/by-center/{centerId}")
    public List<PollingPlaceDto> listByCenter(@PathVariable("centerId") UUID centerId) {
        return pollingPlaceService.listByCenter(centerId);
    }

    @PutMapping("/{id}/active")
    public PollingPlaceDto setActive(@PathVariable UUID id,
                                     @RequestParam boolean active) {
        authz.requireNecAdminOrPlatformAdmin(); // SYSTEM/NEC
        return pollingPlaceService.setActive(id, active);
    }


    /**
     * HARD delete (permanent)
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        authz.requireNecAdminOrPlatformAdmin(); // SYSTEM / NEC
        pollingPlaceService.delete(id);
    }

    @GetMapping
    public Page<PollingPlaceDto> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UUID countyId,
            @RequestParam(required = false) UUID districtId,
            @RequestParam(required = false) UUID centerId,
            @RequestParam(required = false) Boolean active
    ) {
        return pollingPlaceService.list(page, size, q, countyId, districtId, centerId, active);
    }



}
