package election.ems_backend.controller;

import election.ems_backend.dto.NecResultStagingDto;
import election.ems_backend.service.NecResultStagingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * NEC-only endpoints to manage result staging: submit raw uploads, validate and promote.
 *
 * IMPORTANT: secure these endpoints in production (e.g. @PreAuthorize("hasAuthority('ROLE_NEC')"))
 */
@RestController
@RequestMapping("/api/nec/results/staging")
@RequiredArgsConstructor
public class NecResultStagingController {

    private final NecResultStagingService stagingService;

    /**
     * Submit a staging row (single center result upload). Typically used by CSV import or center upload API.
     */
    @PostMapping
    public NecResultStagingDto submitStaging(@RequestBody NecResultStagingDto dto) {
        return stagingService.submitStaging(dto);
    }

    /**
     * List staging rows for an election (NEC operators will review/validate).
     */
    @GetMapping("/{electionId}")
    public List<NecResultStagingDto> listByElection(@PathVariable UUID electionId) {
        return stagingService.listStagingByElection(electionId);
    }

    /**
     * Validate staging rows for the election. If validatorUserId is provided, record who validated.
     * Returns number of rows validated (updated).
     */
    @PostMapping("/{electionId}/validate")
    public ResponseEntity<String> validateByElection(@PathVariable UUID electionId,
                                                     @RequestParam(required = false) UUID validatorUserId) {
        int validated = stagingService.validateStagingByElection(electionId, validatorUserId);
        return ResponseEntity.ok("Validated rows: " + validated);
    }

    /**
     * Promote validated staging rows for the election into authoritative NECResult records.
     * actorUserId is the operator performing the promotion and will be used as uploader/actor.
     * Returns number of rows promoted.
     */
    @PostMapping("/{electionId}/promote")
    public ResponseEntity<String> promoteByElection(@PathVariable UUID electionId,
                                                    @RequestParam(required = false) UUID actorUserId) {
        int promoted = stagingService.promoteValidatedStaging(electionId, actorUserId);
        return ResponseEntity.ok("Promoted rows: " + promoted);
    }
}