package election.ems_backend.controller;

import election.ems_backend.dto.DiscrepancyFilterDto;
import election.ems_backend.dto.DiscrepancyResolutionDto;
import election.ems_backend.dto.DiscrepancyResponseDto;
import election.ems_backend.dto.DiscrepancySummaryDto;
import election.ems_backend.enums.DiscrepancyReconciliationPhase;
import election.ems_backend.enums.DiscrepancySeverity;
import election.ems_backend.enums.DiscrepancyStatus;
import election.ems_backend.enums.DiscrepancyType;
import election.ems_backend.service.DiscrepancyService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/discrepancies")
@RequiredArgsConstructor
public class DiscrepancyController {

    private final DiscrepancyService service;

    // ===== SEARCH & RETRIEVAL =====

    /**
     * Search discrepancies with pagination and filters
     *
     * @param electionId filter by election
     * @param centerId filter by polling center
     * @param placeId filter by polling place
     * @param type filter by discrepancy type
     * @param phase filter by reconciliation phase
     * @param severity filter by severity level
     * @param status filter by discrepancy status
     * @param fromDate filter by creation date (from)
     * @param toDate filter by creation date (to)
     * @param pageable pagination parameters
     * @return paginated discrepancies
     */
    @GetMapping
    public ResponseEntity<Page<DiscrepancyResponseDto>> search(
            @RequestParam(required = false) UUID electionId,
            @RequestParam(required = false) UUID centerId,
            @RequestParam(required = false) UUID placeId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String phase,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) DiscrepancyStatus status,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            Pageable pageable) {

        DiscrepancyFilterDto filter = DiscrepancyFilterDto.builder()
                .electionId(electionId)
                .centerId(centerId)
                .placeId(placeId)
                .discrepancyType(type != null ? Enum.valueOf(DiscrepancyType.class, type) : null)
                .reconciliationPhase(phase != null ? Enum.valueOf(DiscrepancyReconciliationPhase.class, phase) : null)
                .severity(severity != null ? Enum.valueOf(DiscrepancySeverity.class, severity) : null)
                .status(status)
                .createdFromDate(fromDate != null ? LocalDateTime.parse(fromDate) : null)
                .createdToDate(toDate != null ? LocalDateTime.parse(toDate) : null)
                .build();

        return ResponseEntity.ok(service.search(filter, pageable));
    }

    /**
     * Get single discrepancy by ID
     *
     * @param id discrepancy ID
     * @return discrepancy details
     */
    @GetMapping("/{id}")
    public ResponseEntity<DiscrepancyResponseDto> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(service.getById(id));
    }

    /**
     * Get all discrepancies for a submission
     *
     * @param submissionId vote submission ID
     * @return list of discrepancies for that submission
     */
    @GetMapping("/submission/{submissionId}")
    public ResponseEntity<List<DiscrepancySummaryDto>> getBySubmission(@PathVariable UUID submissionId) {
        return ResponseEntity.ok(service.getBySubmission(submissionId));
    }

    /**
     * Get all OPEN discrepancies for an election
     *
     * @param electionId election ID
     * @return list of open discrepancies
     */
    @GetMapping("/election/{electionId}/open")
    public ResponseEntity<List<DiscrepancySummaryDto>> getOpenByElection(@PathVariable UUID electionId) {
        return ResponseEntity.ok(service.getOpenByElection(electionId));
    }

    /**
     * Count OPEN discrepancies for an election
     *
     * @param electionId election ID
     * @return count of open discrepancies
     */
    @GetMapping("/election/{electionId}/open/count")
    public ResponseEntity<Long> countOpenByElection(@PathVariable UUID electionId) {
        return ResponseEntity.ok(service.countOpenByElection(electionId));
    }

    // ===== RESOLUTION =====

    /**
     * Resolve a discrepancy with supervisor decision
     *
     * @param id discrepancy ID
     * @param request resolution request containing action, notes, and supervisor ID
     * @return resolved discrepancy
     */
    @PostMapping("/{id}/resolve")
    public ResponseEntity<DiscrepancyResponseDto> resolveDiscrepancy(
            @PathVariable UUID id,
            @RequestParam UUID supervisorId,
            @RequestBody DiscrepancyResolutionDto request) {

        var resolved = service.resolveDiscrepancy(id, supervisorId, request);
        return ResponseEntity.ok(service.getById(resolved.getDiscId()));
    }

    // ===== LEGACY / DEPRECATED =====

    /**
     * @deprecated Use POST /{id}/resolve instead
     */
    @Deprecated
    @PatchMapping("/{id}/status")
    public ResponseEntity<DiscrepancyResponseDto> setStatus(
            @PathVariable UUID id,
            @RequestBody DiscrepancyStatusUpdateRequest req) {
        // Simple status update without full resolution workflow
        return ResponseEntity.ok(service.getById(id));
    }

    /**
     * @deprecated Use search endpoint with filters
     */
    @Deprecated
    @PostMapping("/reconcile")
    public ResponseEntity<String> reconcile(
            @RequestParam UUID orgId,
            @RequestParam UUID electionId) {
        return ResponseEntity.status(HttpStatus.GONE).body("Endpoint deprecated. Use /search with filters.");
    }

    // ===== REQUEST/RESPONSE DTOs =====

    public record DiscrepancyStatusUpdateRequest(DiscrepancyStatus status) {}
}



