package election.ems_backend.controller;

import election.ems_backend.dto.DistrictDto;
import election.ems_backend.dto.DistrictRequest;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.service.DistrictService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/districts")
@RequiredArgsConstructor
public class DistrictController {

    private final DistrictService service;
    private final AuthorizationService authz;

    @PostMapping
    public ResponseEntity<DistrictDto> create(@Valid @RequestBody DistrictRequest req) {
        authz.requireNecAdminOrPlatformAdmin();
        return ResponseEntity.ok(service.create(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DistrictDto> update(@PathVariable UUID id,
                                              @Valid @RequestBody DistrictRequest req) {
        authz.requireNecAdminOrPlatformAdmin();
        return ResponseEntity.ok(service.update(id, req));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DistrictDto> get(@PathVariable UUID id) {
        return ResponseEntity.ok(service.get(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        authz.requireNecAdminOrPlatformAdmin();
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<Page<DistrictDto>> list(@RequestParam(value = "q", required = false) String q,
                                                  @RequestParam(value = "countyId", required = false) UUID countyId,
                                                  Pageable pageable) {
        return ResponseEntity.ok(service.list(q, countyId, pageable));
    }

    @GetMapping("/by-county/{countyId}")
    public ResponseEntity<List<DistrictDto>> listByCounty(@PathVariable UUID countyId) {
        return ResponseEntity.ok(service.listByCounty(countyId));
    }
}
