package election.ems_backend.controller;

import election.ems_backend.dto.PollingCenterAllocationCreateRequest;
import election.ems_backend.dto.PollingCenterAllocationDto;
import election.ems_backend.dto.PollingCenterAllocationUpdateRequest;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.service.PollingCenterAllocationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
//@RequestMapping(path = "/api/polling-center-allocations",
//        produces = MediaType.APPLICATION_JSON_VALUE)
@RequestMapping("/api/polling-center-allocations")
public class PollingCenterAllocationController {


    private final AuthorizationService authz;
    private final PollingCenterAllocationService allocationService;

    /**
     * Create a new allocation for (election, polling center).
     */
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public PollingCenterAllocationDto create(
            @Valid @RequestBody PollingCenterAllocationCreateRequest req
    ) {
        authz.requireNecAdminOrPlatformAdmin();  // required system admin
        return allocationService.create(req);
    }

    /**
     * Update an existing allocation by id.
     */
    @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public PollingCenterAllocationDto update(
            @PathVariable("id") UUID id,
            @Valid @RequestBody PollingCenterAllocationUpdateRequest req
    ) {
        authz.requireNecAdminOrPlatformAdmin();  // required system admin
        return allocationService.update(id, req);
    }

    /**
     * Delete allocation by id (will fail with 409 if results exist).
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable("id") UUID id) {
        authz.requireNecAdminOrPlatformAdmin();
        allocationService.delete(id);
    }


    /**
     * Get a single allocation by id.
     */
    @GetMapping("/{id}")
    public PollingCenterAllocationDto get(@PathVariable("id") UUID id) {
        return allocationService.get(id);
    }

    /**
     * Search allocations with optional filters:
     *   - electionId
     *   - countyId
     *   - districtId
     *   - centerId
     * Supports standard Spring Data paging params: page, size, sort.
     */
    @GetMapping
    public Page<PollingCenterAllocationDto> search(
            @RequestParam(required = false) UUID electionId,
            @RequestParam(required = false) UUID countyId,
            @RequestParam(required = false) UUID districtId,
            @RequestParam(required = false) UUID centerId,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return allocationService.search(electionId, countyId, districtId, centerId, pageable);
    }

}
