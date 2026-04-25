package election.ems_backend.controller;

import election.ems_backend.dto.AuditLedgerDto;
import election.ems_backend.service.AuditLedgerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Admin endpoints for audit ledger inspection and append.
 * The append endpoint should be restricted to trusted services only.
 */
@RestController
@RequestMapping("/api/admin/audit-ledger")
@RequiredArgsConstructor
public class AuditLedgerController {

    private final AuditLedgerService auditLedgerService;

    @PostMapping("/append")
    public ResponseEntity<AuditLedgerDto> append(@RequestParam String entryType,
                                                 @RequestParam(required = false) UUID entryReference,
                                                 @RequestBody(required = false) String payload,
                                                 @RequestParam(required = false) UUID actorId,
                                                 @RequestParam(required = false) String signature) {
        AuditLedgerDto created = auditLedgerService.appendEntry(entryType, entryReference, payload, actorId, signature);
        return ResponseEntity.ok(created);
    }

    @GetMapping("/latest")
    public ResponseEntity<AuditLedgerDto> latest() {
        return ResponseEntity.of(auditLedgerService.getLatest());
    }

    @GetMapping("/by-reference/{entryReference}")
    public ResponseEntity<List<AuditLedgerDto>> byReference(@PathVariable UUID entryReference) {
        return ResponseEntity.ok(auditLedgerService.listByEntryReference(entryReference));
    }

    @GetMapping("/by-type")
    public ResponseEntity<List<AuditLedgerDto>> byType(@RequestParam String type) {
        return ResponseEntity.ok(auditLedgerService.listByEntryType(type));
    }

    @GetMapping("/verify")
    public ResponseEntity<List<String>> verify() {
        List<String> errors = auditLedgerService.verifyLedgerChain();
        return ResponseEntity.ok(errors);
    }
}