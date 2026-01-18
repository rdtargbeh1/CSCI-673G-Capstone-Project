package election.ems_backend.controller;

import election.ems_backend.dto.VoteTallyDto;
import election.ems_backend.service.VoteTallyService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST API for aggregated vote tallies.
 *
 * Endpoints:
 *  - GET  /api/org/{orgId}/elections/{electionId}/vote-tallies
 *      -> paged search with optional candidateId / partyId filters
 *
 *  - POST /api/org/{orgId}/elections/{electionId}/vote-tallies/recompute
 *      -> recompute tallies for an election (optionally attributed to a user)
 */


@RestController
@RequestMapping("/api/elections/{electionId}/vote-tallies")
@RequiredArgsConstructor
public class VoteTallyController {

    private final VoteTallyService voteTallyService;

    /**
     * Search aggregated vote tallies for an org + election,
     * optionally filtered by candidateId and/or partyId.
     *
     * Example:
     *  GET /api/org/{orgId}/elections/{electionId}/vote-tallies?page=0&size=20
     *  GET /api/org/{orgId}/elections/{electionId}/vote-tallies?candidateId=...&partyId=...
     */
    @GetMapping
    public Page<VoteTallyDto> search(
            @PathVariable("orgId") UUID orgId,
            @PathVariable("electionId") UUID electionId,

            // election-scoped candidate
            @RequestParam(value = "electId", required = false) UUID electId,

            // election-scoped party
            @RequestParam(value = "partyId", required = false) UUID partyId,

            // contest filter
            @RequestParam(value = "contestId", required = false) UUID contestId,

            @PageableDefault(size = 20) Pageable pageable
    ) {
        return voteTallyService.search(
                orgId,
                electionId,
                electId,
                partyId,
                contestId,
                pageable
        );
    }


    /**
     * Recompute tallies for an election using VERIFIED submissions only.
     *
     * If recomputedByUserId is provided, it will be recorded;
     * otherwise the service treats it as a system-triggered recompute.
     *
     * Example:
     *  POST /api/org/{orgId}/elections/{electionId}/vote-tallies/recompute
     *  POST /api/org/{orgId}/elections/{electionId}/vote-tallies/recompute?recomputedByUserId=...
     */
    @PostMapping("/recompute")
    public List<VoteTallyDto> recompute(@PathVariable("orgId") UUID orgId,
                                        @PathVariable("electionId") UUID electionId,
                                        @RequestParam(value = "recomputedByUserId", required = false) UUID recomputedByUserId) {

        if (recomputedByUserId == null) {
            // convenience overload – system recompute (no explicit user)
            return voteTallyService.recomputeForElection(orgId, electionId);
        } else {
            return voteTallyService.recomputeForElection(orgId, electionId, recomputedByUserId);
        }
    }




}
