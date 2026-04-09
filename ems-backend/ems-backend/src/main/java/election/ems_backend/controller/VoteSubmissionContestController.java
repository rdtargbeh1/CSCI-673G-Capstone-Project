package election.ems_backend.controller;

import election.ems_backend.dto.VoteSubmissionContestBulkRequest;
import election.ems_backend.dto.VoteSubmissionContestCreateRequest;
import election.ems_backend.dto.VoteSubmissionContestDto;
import election.ems_backend.dto.VoteSubmissionContestUpdateRequest;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.service.VoteSubmissionContestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Endpoints to trigger normalization of submissions into the normalized contest vote table.
 *
 * This API is NEC/ADMIN-only in production. Keep it protected via method security.
 */
@RestController
@RequestMapping("/api/admin/normalize")
@RequiredArgsConstructor
public class VoteSubmissionContestController {

    private final VoteSubmissionContestService voteSubmissionContestService;
    private final AuthorizationService authz;


    @PostMapping
    public ResponseEntity<VoteSubmissionContestDto> createOrUpdate(@Valid @RequestBody VoteSubmissionContestCreateRequest req) {
        // create-or-update matches unique index design (prevents duplicates)
        return ResponseEntity.status(HttpStatus.CREATED).body(voteSubmissionContestService.createOrUpdate(req));
    }

    @PutMapping("/{scvId}")
    public ResponseEntity<VoteSubmissionContestDto> update(@PathVariable UUID scvId,
                                                           @Valid @RequestBody VoteSubmissionContestUpdateRequest req) {
        return ResponseEntity.ok(voteSubmissionContestService.update(scvId, req));
    }

    @GetMapping("/{scvId}")
    public ResponseEntity<VoteSubmissionContestDto> get(@PathVariable UUID scvId) {
        return ResponseEntity.ok(voteSubmissionContestService.get(scvId));
    }

    @GetMapping
    public ResponseEntity<List<VoteSubmissionContestDto>> listBySubmission(
            @RequestParam UUID submissionId,
            @RequestParam(required = false) UUID contestId
    ) {
        if (contestId == null) {
            return ResponseEntity.ok(voteSubmissionContestService.listBySubmission(submissionId));
        }
        return ResponseEntity.ok(voteSubmissionContestService.listBySubmissionAndContest(submissionId, contestId));
    }

    @DeleteMapping("/{scvId}")
    public ResponseEntity<Void> delete(@PathVariable UUID scvId) {
        voteSubmissionContestService.delete(scvId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Best UX endpoint: replace all votes for a contest in one request.
     * Great for: single choice (1 item), multi choice (many items), ranked (many items with rank).
     */
    @PostMapping("/replace")
    public ResponseEntity<List<VoteSubmissionContestDto>> replaceContestVotes(
            @Valid @RequestBody VoteSubmissionContestBulkRequest req
    ) {
        return ResponseEntity.ok(voteSubmissionContestService.replaceContestVotes(req));
    }

    @PostMapping("/submission/{submissionId}")
    public ResponseEntity<Map<String, Object>> normalizeSubmission(@PathVariable UUID submissionId) {
        authz.requireNecAdminOrPlatformAdmin();
        int rows = voteSubmissionContestService.normalizeSubmission(submissionId);
        return ResponseEntity.ok(Map.of("submissionId", submissionId, "rowsCreated", rows));
    }

    @PostMapping("/election/{electionId}/verified-submissions")
    public ResponseEntity<Map<String, Object>> normalizeVerified(@PathVariable UUID electionId) {
        authz.requireNecAdminOrPlatformAdmin();
        int rows = voteSubmissionContestService.normalizeVerifiedSubmissionsForElection(electionId);
        return ResponseEntity.ok(Map.of("electionId", electionId, "rowsCreated", rows));
    }


}
