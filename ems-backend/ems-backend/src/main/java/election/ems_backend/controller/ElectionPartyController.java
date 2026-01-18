package election.ems_backend.controller;

import election.ems_backend.dto.ElectionPartyAssignRequest;
import election.ems_backend.dto.ElectionPartyDto;
import election.ems_backend.dto.ElectionPartyUpdateRequest;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.service.ElectionPartyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Manages which parties participate in a given election.
 *
 * Design:
 *  - Party list is GLOBAL, controlled centrally (NEC / platform admin).
 *  - election_party is also centrally managed: organizations (tenants) do NOT change it.
 *  - Tenants simply see/use this list when recording votes.
 */
@RestController
@RequestMapping("/api/elections/{electionId}/parties")
@RequiredArgsConstructor
public class ElectionPartyController {



    private final ElectionPartyService electionPartyService;
    private final AuthorizationService authz;

    /**
     * Add a party to an election.
     *
     * Security: Platform-level admin only (central NEC control).
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ElectionPartyDto addPartyToElection(
            @PathVariable UUID electionId,
            @Valid @RequestBody ElectionPartyAssignRequest req) {

        req.setElectionId(electionId);
        authz.requireNecAdminOrPlatformAdmin();
        return electionPartyService.addPartyToElection(req);
    }



    /**
     * List all parties participating in an election.
     *
     * Security: any authenticated tenant can read (no restriction here),
     *           but RLS + org_id will still apply on vote data.
     */
    @GetMapping
    public List<ElectionPartyDto> list(@PathVariable UUID electionId) {
        return electionPartyService.listPartiesForElection(electionId);
    }


    /**
     * Update ballot order / qualification for a party in an election.
     *
     * Security: Platform admin only.
     */
    @PutMapping("/{partyId}")
    public ElectionPartyDto update(
            @PathVariable UUID electionId,
            @PathVariable UUID partyId,
            @Valid @RequestBody ElectionPartyUpdateRequest req) {

        authz.requireNecAdminOrPlatformAdmin();
        return electionPartyService.updateElectionParty(electionId, partyId, req);
    }

    /**
     * Remove a party from an election.
     *
     * Security: Platform admin only.
     */
    @DeleteMapping("/{partyId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable UUID electionId,
            @PathVariable UUID partyId) {

        authz.requireNecAdminOrPlatformAdmin();
        electionPartyService.removePartyFromElection(electionId, partyId);
    }

    @PatchMapping("/{partyId}/qualification")
    public ElectionPartyDto setQualification(
            @RequestParam UUID electionId,
            @PathVariable UUID partyId,
            @RequestParam boolean qualified) {

        authz.requireNecAdminOrPlatformAdmin();
        return electionPartyService.setQualificationStatus(
                electionId, partyId, qualified);
    }


}
