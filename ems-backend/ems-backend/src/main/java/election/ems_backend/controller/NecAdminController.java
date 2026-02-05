package election.ems_backend.controller;

import election.ems_backend.entity.NECResult;
import election.ems_backend.nec.NecResultPublishRequest;
import election.ems_backend.repository.NECResultRepository;
import election.ems_backend.service.NECResultService;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/nec")
@RequiredArgsConstructor
public class NecAdminController {

    private final NECResultRepository necResultRepository;
    private final NECResultService necResultService;


    @GetMapping("/results/{electionId}")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','NEC_ADMIN')")
    public List<?> getRawNecResults(@PathVariable UUID electionId) {
        return necResultRepository.findByElection_ElectionId(electionId);
    }

    // ✅ Publish whole election (best approach for "Publish Election" button)
    @PostMapping("/results/{electionId}/publish")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','NEC_ADMIN')")
    public ResponseEntity<?> publishElection(@PathVariable UUID electionId,
                                             @RequestBody @Valid NecResultPublishRequest req) {

        int changed = necResultService.publishElection(electionId, req);

        return ResponseEntity.ok()
                .body("Published NEC results for election " + electionId
                        + " (changedCount=" + changed + ", publishedUntil=" + req.getPublishedUntil() + ")");
    }

    // ✅ Unpublish whole election (manual override)
    @PostMapping("/results/{electionId}/unpublish")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','NEC_ADMIN')")
    public ResponseEntity<?> unpublishElection(@PathVariable UUID electionId,
                                               @RequestParam UUID actorUserId,
                                               @RequestParam(required = false) String reason) {

        int changed = necResultService.unpublishElection(electionId, actorUserId, reason);

        return ResponseEntity.ok()
                .body("Unpublished NEC results for election " + electionId
                        + " (changedCount=" + changed + ", reason=" + (reason == null ? "N/A" : reason) + ")");
    }




}