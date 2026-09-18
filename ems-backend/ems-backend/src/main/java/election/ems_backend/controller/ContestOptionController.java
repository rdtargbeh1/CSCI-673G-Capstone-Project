package election.ems_backend.controller;

import election.ems_backend.dto.ContestCandidateBulkAssignRequest;
import election.ems_backend.dto.ContestOptionCreateRequest;
import election.ems_backend.dto.ContestOptionDto;
import election.ems_backend.dto.ContestOptionUpdateRequest;
import election.ems_backend.service.ContestOptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Admin endpoints for contest options (CRUD).
 * Protect these endpoints with proper authorization in production (NEC/admin only).
 */
@RestController
@RequestMapping("/api/admin/contest-options")
@RequiredArgsConstructor
public class ContestOptionController {

    private final ContestOptionService optionService;


    @PostMapping
    public ResponseEntity<ContestOptionDto> create(@Valid @RequestBody ContestOptionCreateRequest req) {
        ContestOptionDto created = optionService.createOption(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }


    @GetMapping("/{optionId}")
    public ResponseEntity<ContestOptionDto> get(@PathVariable UUID optionId) {
        return ResponseEntity.ok(optionService.getOption(optionId));
    }


    @GetMapping("/contest/{contestId}")
    public ResponseEntity<List<ContestOptionDto>> listByContest(
            @PathVariable UUID contestId,
            @RequestParam(defaultValue = "true") boolean onlyActive
    ) {
        List<ContestOptionDto> list = optionService.listByContest(contestId, onlyActive);
        return ResponseEntity.ok(list);
    }

    @PutMapping("/{optionId}")
    public ResponseEntity<ContestOptionDto> update(
            @PathVariable UUID optionId,
            @Valid @RequestBody ContestOptionUpdateRequest req
    ) {
        return ResponseEntity.ok(optionService.updateOption(optionId, req));
    }


    @DeleteMapping("/{optionId}")
    public ResponseEntity<Void> delete(@PathVariable UUID optionId) {
        optionService.deleteOption(optionId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/by-candidate/{candidateId}")
    public ResponseEntity<List<ContestOptionDto>> byCandidate(@PathVariable UUID candidateId) {
        return ResponseEntity.ok(optionService.findByCandidateId(candidateId));
    }

    /**
     * Bulk attach candidates to a contest (best UX: checkbox list -> submit once).
     */
    @PostMapping("/bulk-candidates")
    public ResponseEntity<List<ContestOptionDto>> bulkAssignCandidates(
            @Valid @RequestBody ContestCandidateBulkAssignRequest req
    ) {
        return ResponseEntity.ok(optionService.bulkAssignCandidates(req));
    }

}