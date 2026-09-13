package election.ems_backend.controller;


import election.ems_backend.dto.*;
import election.ems_backend.enums.ContestCategory;
import election.ems_backend.enums.ContestScopeType;
import election.ems_backend.enums.VoteStatus;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.service.VoteSubmissionService;
import election.ems_backend.utility.VoteSubmissionDeleteRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/vote-submissions")
@RequiredArgsConstructor
public class VoteSubmissionController {

    private final AuthorizationService authz;
    private final VoteSubmissionService voteSubmissionService;

    // JSON create (no files)
    @PostMapping(path = "", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public VoteSubmissionDto createFromJson(@RequestBody VoteSubmissionCreateRequest req,
                                            HttpServletRequest request) {
        return voteSubmissionService.create(req, request);
    }

    // Multipart create with optional files
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public VoteSubmissionDto create(
            @RequestPart("payload") VoteSubmissionCreateRequest req,
            @RequestPart(value = "files", required = false) List<MultipartFile> files,
            HttpServletRequest request
    ) {
        return (files != null && !files.isEmpty())
                ? voteSubmissionService.create(req, files, request)
                : voteSubmissionService.create(req, request);
    }

    // Update (multipart)
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public VoteSubmissionDto updateMultipart(
            @PathVariable UUID id,
            @RequestPart("payload") VoteSubmissionUpdateRequest req,
            @RequestPart(value = "files", required = false) List<MultipartFile> files
    ) {
        return (files != null && !files.isEmpty())
                ? voteSubmissionService.update(id, req, files)
                : voteSubmissionService.update(id, req, null);
    }

    // Update (JSON)
    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public VoteSubmissionDto updateJson(@PathVariable UUID id, @RequestBody VoteSubmissionUpdateRequest req) {
        return voteSubmissionService.update(id, req, null);
    }

    // ============================================================================
        // VERIFY / REJECT
        //
        // Same review operation:
        // accept=true  -> VERIFIED
        // accept=false -> REJECTED
    // ============================================================================
    @PostMapping("/{id}/verify")
    public VoteSubmissionDto verify(@PathVariable UUID id, @Valid @RequestBody VoteSubmissionVerifyRequest req) {

        authz.requireAny(
                "TENANT_ADMIN",
                "NEC_ADMIN",
                "TALLY_OFFICER"
        );

        return voteSubmissionService.verify(id, req);
    }


    // ============================================================================
        // AMEND
        //
        // Only top administrators.
        // Service must additionally allow VERIFIED status only.
    // ============================================================================

    @PostMapping("/{id}/amend")
    public VoteSubmissionDto amend(@PathVariable UUID id, @Valid @RequestBody VoteSubmissionAmendRequest req) {

        authz.requireAny(
                "TENANT_ADMIN",
                "NEC_ADMIN"
        );

        return voteSubmissionService.amend(id, req);
    }


    @GetMapping("/{id}")
    public VoteSubmissionDto get(@PathVariable UUID id) {
        return voteSubmissionService.get(id);
    }


    /**
     * Delete a vote submission.
     *
     * Rules:
     * - Reason is required
     * - deletedByUserId must be provided (actor, NOT agent)
     * - Triggers NEC recompute to keep official results consistent
     */

    @DeleteMapping("/{submissionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID submissionId,
                       @RequestBody @Valid VoteSubmissionDeleteRequest req) {

        authz.requireAny(
                "NEC_ADMIN",
                "TENANT_ADMIN"
        );

        voteSubmissionService.delete(submissionId, req);
    }


    @GetMapping("/count")
    public long countVisibleSubmissions() {
        return voteSubmissionService.countVisibleSubmissions();
    }

    @PostMapping("/{id}/submit-draft")
    public VoteSubmissionDto submitDraft(@PathVariable UUID id, HttpServletRequest request) {
        return voteSubmissionService.submitDraft(id, request);
    }


    // ============================================================================
        // FLAG / UNFLAG
        // Review-side operation.
    // ============================================================================

    @PostMapping("/{id}/flag")
    public VoteSubmissionDto flag(
            @PathVariable UUID id,
            @Valid @RequestBody VoteSubmissionFlagRequest req
    ) {

        authz.requireAny(
                "NEC_ADMIN",
                "TALLY_OFFICER",
                "TENANT_ADMIN"
        );

        return voteSubmissionService.flag(id, req);
    }


// ============================================================================
// RESUBMIT REJECTED
//
// Agent recovery path.
// Controller establishes authenticated tenant membership.
// Service MUST verify that the authenticated user is the submission's
// original agent before allowing REJECTED -> PENDING.
// ============================================================================

    @PostMapping("/{submissionId}/resubmit")
    public ResponseEntity<VoteSubmissionDto> resubmitRejected(
            @PathVariable UUID submissionId,
            @Valid @RequestBody VoteSubmissionResubmitRequest request
    ) {

        authz.requireAny(
                "NEC_ADMIN",
                "TENANT_ADMIN",
                "ADMIN",
                "TALLY_OFFICER",
                "COORDINATOR",
                "SUPERVISOR",
                "FIELD_OFFICER",
                "PRESIDING_OFFICER",
                "DATA_ENTRY"
        );


//        authz.requireMembership();

        return ResponseEntity.ok(
                voteSubmissionService.resubmitRejected(
                        submissionId,
                        request
                )
        );
    }


// ============================================================================
// REOPEN REJECTED
//
// Administrative review/reversal.
// Does not change vote data.
// REJECTED -> PENDING only.
// ============================================================================

    @PostMapping("/{submissionId}/reopen")
    public ResponseEntity<VoteSubmissionDto> reopenRejected(
            @PathVariable UUID submissionId,
            @Valid @RequestBody VoteSubmissionReopenRequest request
    ) {

        authz.requireAny(
                "TENANT_ADMIN",
                "NEC_ADMIN"
        );


        return ResponseEntity.ok(
                voteSubmissionService.reopenRejected(
                        submissionId,
                        request
                )
        );
    }

    /**
     * Search submissions with contest-aware filters.
     *
     * Why:
     * - Agents submit per contest
     * - Review screens need category/scope filters (e.g. PRESIDENT, COUNTY senate, DISTRICT rep)
     */
    @GetMapping
    public Page<VoteSubmissionDto> search(
            @RequestParam(required = false) UUID orgId,
            @RequestParam(required = false) UUID electionId,
            @RequestParam(required = false) UUID centerId,
            @RequestParam(required = false) UUID agentId,
            @RequestParam(required = false) VoteStatus status,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(required = false) String q,

            // ✅ contest-related filters
            @RequestParam(required = false) UUID contestId,
            @RequestParam(required = false) ContestCategory category,
            @RequestParam(required = false) ContestScopeType scopeType,

            // ✅ submission location filters (county/district/center)
            @RequestParam(required = false) UUID countyId,
            @RequestParam(required = false) UUID districtId,

            // ✅ NEW: soft-delete behavior
            @RequestParam(defaultValue = "false") boolean includeDeleted,

            @PageableDefault(size = 20, sort = "submissionTime", direction = Sort.Direction.DESC)
            Pageable pageable
    ) {
        return voteSubmissionService.search(
                orgId,
                electionId,
                centerId,
                agentId,
                status,
                from,
                to,
                q,
                category,
                scopeType,
                countyId,
                districtId,
                contestId,
                includeDeleted,   // ✅ NEW
                pageable
        );
    }


}
