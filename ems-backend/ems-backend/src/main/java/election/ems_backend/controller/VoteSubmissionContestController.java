package election.ems_backend.controller;

import election.ems_backend.dto.*;
import election.ems_backend.repository.VoteSubmissionContestRepository;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.service.VoteSubmissionContestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
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
@RequestMapping("/api/org/{orgId}/elections/{electionId}/normalize")
@RequiredArgsConstructor
public class VoteSubmissionContestController {

    private final VoteSubmissionContestService voteSubmissionContestService;
    private final AuthorizationService authz;

    // ✅ Search
    @GetMapping
    public Page<VoteSubmissionContestRepository.SubmissionContestRowView> search(
            @PathVariable UUID orgId,
            @PathVariable UUID electionId,
            @RequestParam(required = false) UUID countyId,
            @RequestParam(required = false) UUID districtId,
            @RequestParam(required = false) UUID centerId,
            @RequestParam(required = false) UUID contestId,
            @RequestParam(required = false) UUID candidateId,
            @PageableDefault(size = 25) Pageable pageable
    ) {
//        authz.requireAnyInTenantOrPlatformAdmin();
        return voteSubmissionContestService.search(
                orgId, electionId,
                countyId, districtId, centerId,
                contestId, candidateId,
                pageable
        );
    }

    // ✅ Normalize a single submission
    @PostMapping("/submission/{submissionId}")
    public ResponseEntity<Map<String, Object>> normalizeSubmission(
            @PathVariable UUID orgId,
            @PathVariable UUID electionId,
            @PathVariable UUID submissionId
    ) {
        authz.requireAnyInTenantOrPlatformAdmin();
        int rows = voteSubmissionContestService.normalizeSubmission(submissionId);
        return ResponseEntity.ok(Map.of("submissionId", submissionId, "rowsCreated", rows));
    }

    // ✅ Normalize VERIFIED submissions for THIS electionId (already in base path)
    @PostMapping("/verified-submissions")
    public ResponseEntity<Map<String, Object>> normalizeVerified() {
        authz.requireAnyInTenantOrPlatformAdmin();
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    // ✅ Correct normalizeVerified with electionId available:
    @PostMapping("/verified-submissions/run")
    public ResponseEntity<Map<String, Object>> normalizeVerifiedRun(
            @PathVariable UUID electionId
    ) {
        authz.requireAnyInTenantOrPlatformAdmin();
        int rows = voteSubmissionContestService.normalizeVerifiedSubmissionsForElection(electionId);
        return ResponseEntity.ok(Map.of("electionId", electionId, "rowsCreated", rows));
    }



}



