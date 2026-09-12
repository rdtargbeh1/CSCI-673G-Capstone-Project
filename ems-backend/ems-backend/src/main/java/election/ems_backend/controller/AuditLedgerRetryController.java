package election.ems_backend.controller;

import election.ems_backend.dto.AuditLedgerRetryDto;
import election.ems_backend.service.AuditLedgerRetryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Admin endpoints to inspect and force retry of failed audit ledger entries.
 * Protect with admin-only security in production.
 */
@RestController
@RequestMapping("/api/admin/audit/retries")
@RequiredArgsConstructor
public class AuditLedgerRetryController {

    private final AuditLedgerRetryService retryService;

    @GetMapping
    public ResponseEntity<List<AuditLedgerRetryDto>> list(@RequestParam(value = "limit", defaultValue = "50") int limit) {
        return ResponseEntity.ok(retryService.listPending(limit));
    }

    @PostMapping("/{retryId}/retry")
    public ResponseEntity<String> retryOne(@PathVariable UUID retryId) {
        retryService.processSingle(retryId);
        return ResponseEntity.ok("Retry scheduled/processed");
    }

}