package election.ems_backend.controller;

import election.ems_backend.dto.PollingCenterCreateRequest;
import election.ems_backend.dto.PollingCenterDto;
import election.ems_backend.dto.PollingCenterUpdateRequest;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.service.PollingCenterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/polling-centers")
@RequiredArgsConstructor
public class PollingCenterController {

    private final AuthorizationService authz;
    private final PollingCenterService service;



    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PollingCenterDto create(@Valid @RequestBody PollingCenterCreateRequest req) {
        authz.requireNecAdminOrPlatformAdmin();
        return service.create(req);
    }

    @PutMapping("/{id}")
    public PollingCenterDto update(@PathVariable UUID id, @RequestBody PollingCenterUpdateRequest req) {
        authz.requireNecAdminOrPlatformAdmin();
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable UUID id) {
        authz.requireNecAdminOrPlatformAdmin();
        service.delete(id);
    }

    @GetMapping("/{id}")
    public PollingCenterDto get(@PathVariable UUID id) {
        return service.get(id);
    }

    @GetMapping
    public Page<PollingCenterDto> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UUID countyId,
            @RequestParam(required = false) UUID districtId,
            @PageableDefault(size = 50, sort = "centerName") Pageable pageable
    ) {
        return service.search(q, countyId, districtId, pageable);
    }




}
