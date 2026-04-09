package election.ems_backend.controller;


import election.ems_backend.dto.DiscrepancyDto;
import election.ems_backend.dto.DiscrepancySearchRequest;
import election.ems_backend.enums.DiscrepancyStatus;
import election.ems_backend.service.DiscrepancyService;
import election.ems_backend.utility.DiscrepancyStatusUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/discrepancies")
@RequiredArgsConstructor
public class DiscrepancyController {

    private final DiscrepancyService service;

    @GetMapping
    public Page<DiscrepancyDto> search(
            @RequestParam(required = false) UUID electionId,
            @RequestParam(required = false) UUID countyId,
            @RequestParam(required = false) UUID districtId,
            @RequestParam(required = false) UUID centerId,
            @RequestParam(required = false) DiscrepancyStatus status,
            Pageable pageable
    ) {
        return service.search(new DiscrepancySearchRequest(electionId, countyId, districtId, centerId, status), pageable);
    }

    @GetMapping("/{id}")
    public DiscrepancyDto get(@PathVariable UUID id) { return service.get(id); }

    @PatchMapping("/{id}/status")
    public DiscrepancyDto setStatus(@PathVariable UUID id,
                                    @RequestBody DiscrepancyStatusUpdateRequest req) {
        return service.updateStatus(id, req.status());
    }

    /** Recompute diffs for an org & election; returns the current OPEN/updated discrepancies. */
    @PostMapping("/reconcile")
    public List<DiscrepancyDto> reconcile(@RequestParam UUID orgId, @RequestParam UUID electionId) {
        return service.reconcile(orgId, electionId);
    }
}
