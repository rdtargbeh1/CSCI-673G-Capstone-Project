package election.ems_backend.controller;


import election.ems_backend.dto.ImportBatchDto;
import election.ems_backend.service.ImportBatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Import batch endpoints for staging workflows (NEC operators).
 */
@RestController
@RequestMapping("/api/nec/imports")
@RequiredArgsConstructor
public class ImportBatchController {

    private final ImportBatchService batchService;

    @PostMapping
    public ImportBatchDto createBatch(@RequestBody ImportBatchDto dto) {
        return batchService.createBatch(dto);
    }

    @GetMapping("/{batchId}")
    public ImportBatchDto getBatch(@PathVariable UUID batchId) {
        return batchService.getBatch(batchId);
    }

    @GetMapping("/by-user/{createdBy}")
    public List<ImportBatchDto> listByUser(@PathVariable UUID createdBy) {
        return batchService.listBatchesByCreator(createdBy);
    }

    @PostMapping("/{batchId}/validate")
    public ResponseEntity<String> validateBatch(@PathVariable UUID batchId,
                                                @RequestParam(required = false) UUID validatorUserId) {
        int validated = batchService.validateBatch(batchId, validatorUserId);
        return ResponseEntity.ok("Validated rows: " + validated);
    }

    @PostMapping("/{batchId}/process")
    public ResponseEntity<String> processBatch(@PathVariable UUID batchId,
                                               @RequestParam(required = false) UUID actorUserId) {
        int processed = batchService.processBatch(batchId, actorUserId);
        return ResponseEntity.ok("Processed rows: " + processed);
    }
}