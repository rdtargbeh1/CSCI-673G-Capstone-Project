package election.ems_backend.controller;

import election.ems_backend.service.VoterRollService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/nec/rolls")
@RequiredArgsConstructor
public class NecVoterRollController {

    private final VoterRollService service;

    // Publish the roll (NEC-only)
    @PostMapping("/{electionId}/publish")
    // TODO: enable method-level security: @PreAuthorize("hasAuthority('ROLE_NEC')")
    public ResponseEntity<?> publish(@PathVariable UUID electionId, @RequestParam(required = false) UUID actorUserId) {
        int rows = service.publishRoll(electionId, actorUserId);
        return ResponseEntity.ok().body("Published " + rows + " rows");
    }

    // Unpublish the roll (NEC-only)
    @DeleteMapping("/{electionId}/publish")
    // TODO: @PreAuthorize("hasAuthority('ROLE_NEC')")
    public ResponseEntity<?> unpublish(@PathVariable UUID electionId, @RequestParam(required = false) UUID actorUserId) {
        service.unpublishRoll(electionId, actorUserId);
        return ResponseEntity.noContent().build();
    }
}