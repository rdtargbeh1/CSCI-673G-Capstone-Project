package election.ems_backend.controller;

import election.ems_backend.dto.ElectionCreateRequest;
import election.ems_backend.dto.ElectionDto;
import election.ems_backend.dto.ElectionLifecycleRequest;
import election.ems_backend.dto.ElectionSearchRequest;
import election.ems_backend.dto.ElectionUpdateRequest;
import election.ems_backend.enums.ElectionAccessStatus;
import election.ems_backend.enums.ElectionType;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.service.ElectionService;
import election.ems_backend.utility.ElectionStatsDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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

    private final ElectionService electionService;

    private final AuthorizationService authz;


    // ========================================================================
    // CREATE
    // ========================================================================

    /**
     * Create a new election.
     *
     * Election creation is restricted to:
     *
     * - Platform SYSTEM_ADMIN
     * - NEC tenant NEC_ADMIN
     *
     * The service/policy layer performs the authoritative
     * NEC organization-type validation.
     */
    @PostMapping
    public ElectionDto create(@Valid @RequestBody ElectionCreateRequest req) {
        authz.requireNecAdminOrPlatformAdmin();

        return electionService.create(
                req
        );
    }


    // ========================================================================
    // UPDATE GENERAL ELECTION INFORMATION
    // ========================================================================

    /**
     * Update normal election information.
     *
     * Lifecycle fields are intentionally managed separately through
     * /{id}/lifecycle.
     */
    @PutMapping("/{id}")
    public ElectionDto update(@PathVariable UUID id,
                              @Valid @RequestBody ElectionUpdateRequest req) {

        authz.requireNecAdminOrPlatformAdmin();

        return electionService.update(
                id,
                req
        );
    }


    // ========================================================================
    // UPDATE ELECTION LIFECYCLE
    // ========================================================================

    /**
     * Update election lifecycle and operational timing.
     *
     * Managed fields include:
     *
     * - accessStatus
     * - availableAt
     * - startAt
     * - endAt
     * - availableUntil
     * - archivedReason
     *
     * Example lifecycle:
     *
     * DRAFT
     *   -> AVAILABLE
     *   -> ARCHIVED
     *
     * DRAFT / AVAILABLE
     *   -> CANCELLED
     *
     * Only platform SYSTEM_ADMIN or NEC tenant NEC_ADMIN
     * may manage election lifecycle.
     */
    @PutMapping("/{id}/lifecycle")
    public ElectionDto updateLifecycle(@PathVariable UUID id,
                                       @Valid @RequestBody ElectionLifecycleRequest req) {

        authz.requireNecAdminOrPlatformAdmin();

        return electionService.updateLifecycle(
                id,
                req
        );
    }


    // ========================================================================
    // DELETE
    // ========================================================================

    /**
     * Delete an election.
     *
     * The service restricts physical deletion to eligible DRAFT elections.
     *
     * Released elections should normally be cancelled or archived instead.
     */
    @DeleteMapping("/{id}")
    public void delete(@PathVariable UUID id) {

        authz.requireAny("NEC_ADMIN");

        electionService.delete(
                id
        );
    }


    // ========================================================================
    // GET SINGLE ELECTION
    // ========================================================================

    /**
     * Retrieve one election.
     *
     * Visibility is enforced by ElectionService / ElectionAccessPolicy.
     *
     * Examples:
     *
     * NEC:
     * - may read internal DRAFT elections
     *
     * Political party / coalition / other tenant:
     * - DRAFT is hidden
     * - AVAILABLE follows availability rules
     * - ARCHIVED remains available historically
     */
    @GetMapping("/{id}")
    public ElectionDto get(@PathVariable UUID id) {

        return electionService.get(
                id
        );
    }


    // ========================================================================
    // LIST ELECTIONS
    // ========================================================================

    /**
     * List elections visible to the current caller.
     *
     * activeOnly=true:
     * returns only technically active elections that the caller
     * is authorized to see.
     *
     * activeOnly=false:
     * returns all lifecycle-visible elections for the caller.
     */
    @GetMapping
    public List<ElectionDto> listElections(@RequestParam(name = "activeOnly", required = false,
            defaultValue = "false") boolean activeOnly) {

        if (activeOnly) {

            return electionService
                    .listActiveElections();
        }


        return electionService
                .listAllElections();
    }


    // ========================================================================
    // ORGANIZATION ELECTION STATS
    // ========================================================================

    /**
     * Organization-specific election statistics.
     *
     * Regular tenants must not be able to retrieve another
     * organization's private election statistics merely by changing orgId.
     *
     * That authorization is enforced in ElectionService.
     */
    @GetMapping("/org-election/stats")
    public ElectionStatsDto getOrgElectionStats(

            @RequestParam
            UUID orgId,

            @RequestParam
            UUID electionId
    ) {

        return electionService.getOrgElectionStats(
                orgId,
                electionId
        );
    }


    // ========================================================================
    // SEARCH
    // ========================================================================

    /**
     * Search elections visible to the current caller.
     *
     * Request filters may narrow the visible result set.
     *
     * They must never override lifecycle authorization.
     *
     * Examples:
     *
     * ?accessStatus=DRAFT
     *     NEC/system users may receive matching drafts.
     *     regular tenants still cannot see drafts.
     *
     * ?operationalNow=true
     *     elections currently inside startAt/endAt.
     *
     * ?postElection=true
     *     elections after endAt but before availableUntil.
     *
     * ?archiveDue=true
     *     AVAILABLE elections whose availableUntil has expired.
     */
    @GetMapping("/search")
    public Page<ElectionDto> search(

            @RequestParam(required = false)
            String q,

            @RequestParam(required = false)
            Integer year,

            @RequestParam(required = false)
            ElectionType type,

            @RequestParam(required = false)
            Boolean active,

            @RequestParam(required = false)
            ElectionAccessStatus accessStatus,

            @RequestParam(required = false)
            Boolean availableNow,

            @RequestParam(required = false)
            Boolean operationalNow,

            @RequestParam(required = false)
            Boolean postElection,

            @RequestParam(required = false)
            Boolean archiveDue,

            @PageableDefault(
                    size = 20,
                    sort = "year",
                    direction = Sort.Direction.DESC
            )
            Pageable pageable
    ) {

        ElectionSearchRequest req =
                new ElectionSearchRequest(
                        q,
                        year,
                        type,
                        active,
                        accessStatus,
                        availableNow,
                        operationalNow,
                        postElection,
                        archiveDue
                );


        return electionService.search(
                req,
                pageable
        );
    }


    // ========================================================================
    // ACTIVE / INACTIVE
    // ========================================================================

    /**
     * Administrative / technical enable-disable switch.
     *
     * This does not replace ElectionAccessStatus.
     *
     * The service prevents this endpoint from silently reopening
     * ARCHIVED or CANCELLED elections.
     */
    @PatchMapping("/{id}/active")
    public ResponseEntity<ElectionDto> setActive(

            @PathVariable
            UUID id,

            @RequestParam("active")
            boolean active
    ) {

        authz.requireNecAdminOrPlatformAdmin();


        return ResponseEntity.ok(
                electionService.setActive(
                        id,
                        active
                )
        );
    }


}