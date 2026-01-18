package election.ems_backend.controller;

import election.ems_backend.entity.NECResult;
import election.ems_backend.repository.NECResultRepository;
import jakarta.transaction.Transactional;
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

    // NEC + SYSTEM_ADMIN can see drafts + published
    @GetMapping("/results/{electionId}")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','NEC_ADMIN')")
    public List<NECResult> getRawNecResults(@PathVariable UUID electionId) {
        return necResultRepository.findByElection_ElectionId(electionId);
    }

    // Publish all results for one election
    @PostMapping("/results/{electionId}/publish")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','NEC_ADMIN')")
    @Transactional
    public ResponseEntity<?> publishElection(@PathVariable UUID electionId) {
        int updated = necResultRepository.publishElectionResults(electionId);
        return ResponseEntity.ok()
                .body("Published NEC results for election " + electionId + " (rows updated = " + updated + ")");
    }
}