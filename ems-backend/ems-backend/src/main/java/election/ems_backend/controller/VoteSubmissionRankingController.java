package election.ems_backend.controller;

import election.ems_backend.dto.VoteSubmissionRankingDto;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.service.VoteSubmissionRankingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Admin endpoints for submission vote ranking management (CRUD + backfill).
 * These endpoints are sensitive and should be protected (admin-only).
 */
@RestController
@RequestMapping("/api/admin/submission-rankings")
@RequiredArgsConstructor
public class VoteSubmissionRankingController {


    private final VoteSubmissionRankingService service;
    private final AuthorizationService authz;

    @PostMapping
    public ResponseEntity<VoteSubmissionRankingDto> createOrUpdate(@RequestBody VoteSubmissionRankingDto dto) {
        authz.requireNecAdminOrPlatformAdmin();
        VoteSubmissionRankingDto saved = service.createOrUpdateRanking(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/{svrId}")
    public ResponseEntity<VoteSubmissionRankingDto> get(@PathVariable UUID svrId) {
        authz.requireNecAdminOrPlatformAdmin();
        return ResponseEntity.ok(service.getById(svrId));
    }

    @GetMapping("/by-submission/{submissionId}")
    public ResponseEntity<List<VoteSubmissionRankingDto>> bySubmission(@PathVariable UUID submissionId) {
        authz.requireNecAdminOrPlatformAdmin();
        return ResponseEntity.ok(service.getBySubmission(submissionId));
    }

    @GetMapping("/by-contest/{contestId}")
    public ResponseEntity<List<VoteSubmissionRankingDto>> byContest(@PathVariable UUID contestId) {
        authz.requireNecAdminOrPlatformAdmin();
        return ResponseEntity.ok(service.getByContest(contestId));
    }

    @DeleteMapping("/{svrId}")
    public ResponseEntity<Void> delete(@PathVariable UUID svrId) {
        authz.requireNecAdminOrPlatformAdmin();
        service.deleteById(svrId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/backfill/election/{electionId}")
    public ResponseEntity<?> backfill(@PathVariable UUID electionId) {
        authz.requireNecAdminOrPlatformAdmin();
        int processed = service.backfillFromVerifiedSubmissionsForElection(electionId);
        return ResponseEntity.ok(java.util.Map.of("electionId", electionId, "processed", processed));
    }



}