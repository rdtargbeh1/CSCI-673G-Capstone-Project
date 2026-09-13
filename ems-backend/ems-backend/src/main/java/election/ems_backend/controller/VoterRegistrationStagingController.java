package election.ems_backend.controller;

import election.ems_backend.dto.VoterRegistrationStagingCreateRequest;
import election.ems_backend.dto.VoterRegistrationStagingDto;
import election.ems_backend.service.VoterRegistrationStagingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * NEC-only staging controller for bulk import and promotion workflows.
 * Secure these endpoints with NEC-only authority in production.
 */
@RestController
@RequestMapping("/api/nec/staging")
@RequiredArgsConstructor
public class VoterRegistrationStagingController {

    private final VoterRegistrationStagingService stagingService;

    @PostMapping("/rows")
    public VoterRegistrationStagingDto submitRow(@RequestBody VoterRegistrationStagingCreateRequest req) {
        return stagingService.submitRow(req);
    }

    @GetMapping("/batches/{batchId}/rows")
    public List<VoterRegistrationStagingDto> listByBatch(@PathVariable UUID batchId) {
        return stagingService.listByBatch(batchId);
    }

    @PostMapping("/batches/{batchId}/validate")
    public String validateBatch(@PathVariable UUID batchId, @RequestParam(required = false) UUID validatorUserId) {
        int updated = stagingService.validateBatch(batchId, validatorUserId);
        return "Validated rows: " + updated;
    }

    @PostMapping("/batches/{batchId}/promote")
    public String promoteBatch(@PathVariable UUID batchId, @RequestParam(required = false) UUID actorUserId) {
        int promoted = stagingService.promoteBatch(batchId, actorUserId);
        return "Promoted rows: " + promoted;
    }
}