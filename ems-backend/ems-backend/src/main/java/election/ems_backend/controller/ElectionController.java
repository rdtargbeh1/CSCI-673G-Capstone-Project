package election.ems_backend.controller;

import election.ems_backend.dto.ElectionCreateRequest;
import election.ems_backend.dto.ElectionDto;
import election.ems_backend.dto.ElectionSearchRequest;
import election.ems_backend.dto.ElectionUpdateRequest;
import election.ems_backend.enums.ElectionType;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.service.ElectionService;
import election.ems_backend.service.VoteSubmissionService;
import election.ems_backend.utility.ElectionStatsDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/elections")
@RequiredArgsConstructor
public class ElectionController {

    @Autowired
    private ElectionService electionService;
    @Autowired
    private VoteSubmissionService voteSubmissionService;
    private final AuthorizationService authz;


    /**
     * Create a new election.
     * Only platform admins (SYSTEM_ADMIN / NEC-level) may create elections.
     */
    @PostMapping
    public ElectionDto create(@Valid @RequestBody ElectionCreateRequest req) {
        authz.requireNecAdminOrPlatformAdmin();
        return electionService.create(req);
    }

    /**
     * Update an existing election.
     * Only platform admins may update elections.
     */
    @PutMapping("/{id}")
    public ElectionDto update(@PathVariable UUID id,
                              @Valid @RequestBody ElectionUpdateRequest req) {
        authz.requireNecAdminOrPlatformAdmin();
        return electionService.update(id, req);
    }

    /**
     * Delete an election by id.
     * Only platform admins may delete elections.
     */
    @DeleteMapping("/{id}")
    public void delete(@PathVariable UUID id) {
        authz.requireNecAdminOrPlatformAdmin();   // <-- protect delete
        electionService.delete(id);
    }

    /**
     * Retrieve a single election by id.
     * Read-only; no special authorization (tenants can see which elections exist).
     */
    @GetMapping("/{id}")
    public ElectionDto get(@PathVariable UUID id) {
        return electionService.get(id);
    }

    /**
     * List elections.
     * If ?activeOnly=true, only active elections are returned.
     */
    @GetMapping
    public List<ElectionDto> listElections(
            @RequestParam(name = "activeOnly", required = false, defaultValue = "false")
            boolean activeOnly
    ) {
        if (activeOnly) {
            return electionService.listActiveElections();
        }
        return electionService.listAllElections();
    }

    /**
     * Example:
     * GET /api/stats/org-election?orgId={uuid}&electionId={uuid}
     */
    @GetMapping("/org-election/stats")
    public ElectionStatsDto getOrgElectionStats(
            @RequestParam UUID orgId,
            @RequestParam UUID electionId
    ) {
        return electionService.getOrgElectionStats(orgId, electionId);
    }


    /**
     * Search elections with optional filters (q, year, type, active).
     * Read-only; open to authenticated callers.
     */
    @GetMapping("/search")
    public Page<ElectionDto> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) ElectionType type,
            @RequestParam(required = false) Boolean active,
            @PageableDefault(size = 20, sort = "year", direction = Sort.Direction.DESC)
            Pageable pageable) {

        return electionService.search(ElectionSearchRequest.of(q, year, type, active), pageable);
    }

    @PatchMapping("/{id}/active")
    public ResponseEntity<ElectionDto> setActive(@PathVariable UUID id, @RequestParam("active") boolean active) {
        authz.requireNecAdminOrPlatformAdmin();
        return ResponseEntity.ok(electionService.setActive(id, active));
    }



}