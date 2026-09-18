package election.ems_backend.controller;

import election.ems_backend.dto.AnomalyEventCreateRequest;
import election.ems_backend.dto.AnomalyEventDto;
import election.ems_backend.dto.AnomalyEventUpdateRequest;
import election.ems_backend.enums.AnomalyKind;
import election.ems_backend.service.AnomalyEventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/anomalies")
@RequiredArgsConstructor
public class AnomalyEventController {

    private final AnomalyEventService service;

    @PostMapping
    public AnomalyEventDto create(@RequestBody @Valid AnomalyEventCreateRequest req) {
        return service.create(req);
    }

    @PatchMapping("/{id}")
    public AnomalyEventDto update(@PathVariable("id") UUID id, @RequestBody AnomalyEventUpdateRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    public AnomalyEventDto get(@PathVariable("id") UUID id) {
        return service.get(id);
    }

    @GetMapping
    public Page<AnomalyEventDto> search(
            @RequestParam(required = false) UUID orgId,
            @RequestParam(required = false) UUID electionId,
            @RequestParam(required = false) UUID centerId,
            @RequestParam(required = false) AnomalyKind kind,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20, sort = "dateCreated", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return service.search(orgId, electionId, centerId, kind, from, to, q, pageable);
    }
}
