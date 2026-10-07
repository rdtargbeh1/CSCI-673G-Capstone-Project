package election.ems_backend.controller;

import election.ems_backend.dto.*;
import election.ems_backend.entity.VoteSubmission;
import election.ems_backend.enums.VoteStatus;
import election.ems_backend.mapper.VoteSubmissionMapper;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.service.implement.OperationVoteSubmissionServiceImplementation;
import election.ems_backend.utility.VoteSubmissionDeleteRequest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;


/**
 * ========================================================================
 * OPERATIONS VOTE SUBMISSION CONTROLLER
 * ========================================================================
 *
 * Operations-specific API for election-day vote submission workflows.
 *
 * This controller is separate from:
 *
 *     /api/vote-submissions
 *
 * which remains the Election Workspace submission API.
 *
 *
 * OPERATIONS API:
 *
 *     /api/operations/submissions
 *
 *
 * SECURITY MODEL
 *
 * AuthorizationService
 *     -> authenticated tenant membership
 *
 * OperationVoteSubmissionServiceImplementation
 *     -> authenticated user / organization
 *     -> election assignment
 *     -> geographic access
 *     -> action matrix
 *
 *
 * VoteSubmissionService
 *     -> actual vote-submission workflow
 *
 * ========================================================================
 */
@RestController
@RequestMapping("/api/operations/submissions")
@RequiredArgsConstructor
public class OperationVoteSubmissionController {

    private final AuthorizationService authz;

    private final OperationVoteSubmissionServiceImplementation operationService;

    private final VoteSubmissionMapper mapper;


    // ========================================================================
    // SEARCH
    // ========================================================================

    /**
     * Returns only submissions inside the authenticated user's
     * Operations assignment.
     *
     * Requested geography filters can narrow the result but cannot
     * expand the user's authorized scope.
     */
    @GetMapping
    public Page<VoteSubmissionDto> search(
            @RequestParam UUID electionId,

            @RequestParam(required = false)
            VoteStatus status,

            @RequestParam(required = false)
            UUID contestId,

            @RequestParam(required = false)
            UUID countyId,

            @RequestParam(required = false)
            UUID districtId,

            @RequestParam(required = false)
            UUID centerId,

            @RequestParam(required = false)
            UUID placeId,

            @PageableDefault(
                    size = 20,
                    sort = "submissionTime",
                    direction = Sort.Direction.DESC
            )
            Pageable pageable
    ) {

        authz.requireMembership();


        return operationService
                .search(
                        electionId,
                        status,
                        contestId,
                        countyId,
                        districtId,
                        centerId,
                        placeId,
                        pageable
                )
                .map(
                        mapper::toDTO
                );
    }


    // ========================================================================
    // GET ONE
    // ========================================================================

    @GetMapping("/{submissionId}")
    public VoteSubmissionDto get(
            @PathVariable UUID submissionId
    ) {

        authz.requireMembership();


        VoteSubmission submission =
                operationService.getById(
                        submissionId
                );


        return mapper.toDTO(
                submission
        );
    }


    // ========================================================================
    // CREATE - JSON
    // ========================================================================

    /**
     * CREATE is permitted only for:
     *
     * PLACE
     * CENTER
     *
     * The submission itself always originates from a polling place.
     */
    @PostMapping(
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @ResponseStatus(HttpStatus.CREATED)
    public VoteSubmissionDto createJson(
            @Valid
            @RequestBody
            VoteSubmissionCreateRequest request,

            HttpServletRequest httpRequest
    ) {

        authz.requireMembership();


        return operationService.create(
                request,
                httpRequest
        );
    }


    // ========================================================================
    // CREATE - MULTIPART
    // ========================================================================

    @PostMapping(
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @ResponseStatus(HttpStatus.CREATED)
    public VoteSubmissionDto createMultipart(
            @Valid
            @RequestPart("payload")
            VoteSubmissionCreateRequest request,

            @RequestPart(
                    value = "files",
                    required = false
            )
            List<MultipartFile> files,

            HttpServletRequest httpRequest
    ) {

        authz.requireMembership();


        return operationService.create(
                request,
                files,
                httpRequest
        );
    }


    // ========================================================================
    // UPDATE - JSON
    // ========================================================================

    /**
     * Current Operations edit rules:
     *
     * PLACE
     *     -> own submission
     *
     * CENTER
     *     -> submissions under assigned center(s)
     *
     * DISTRICT
     *     -> no edit
     *
     * COUNTY
     *     -> submissions under assigned county
     *
     * MULTI_COUNTY
     *     -> submissions under assigned counties
     *
     * ORGANIZATION
     *     -> submissions in own organization
     */
    @PutMapping(
            value = "/{submissionId}",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public VoteSubmissionDto updateJson(
            @PathVariable UUID submissionId,

            @Valid
            @RequestBody
            VoteSubmissionUpdateRequest request
    ) {

        authz.requireMembership();


        return operationService.update(
                submissionId,
                request,
                null
        );
    }


    // ========================================================================
    // UPDATE - MULTIPART
    // ========================================================================

    @PutMapping(
            value = "/{submissionId}",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public VoteSubmissionDto updateMultipart(
            @PathVariable UUID submissionId,

            @Valid
            @RequestPart("payload")
            VoteSubmissionUpdateRequest request,

            @RequestPart(
                    value = "files",
                    required = false
            )
            List<MultipartFile> files
    ) {

        authz.requireMembership();


        return operationService.update(
                submissionId,
                request,
                files
        );
    }


    // ========================================================================
    // SUBMIT DRAFT
    // ========================================================================

    /**
     * Field submission lifecycle.
     *
     * PLACE / CENTER only.
     *
     * Existing VoteSubmissionService performs:
     *
     * DRAFT -> PENDING
     *
     * plus final vote/tally validation.
     */
    @PostMapping("/{submissionId}/submit-draft")
    public VoteSubmissionDto submitDraft(
            @PathVariable UUID submissionId,
            HttpServletRequest request
    ) {

        authz.requireMembership();


        return operationService.submitDraft(
                submissionId,
                request
        );
    }


    // ========================================================================
    // VERIFY / REJECT
    // ========================================================================

    /**
     * Allowed scopes:
     *
     * DISTRICT
     * COUNTY
     * MULTI_COUNTY
     * ORGANIZATION
     */
    @PostMapping("/{submissionId}/verify")
    public VoteSubmissionDto verify(
            @PathVariable UUID submissionId,

            @Valid
            @RequestBody
            VoteSubmissionVerifyRequest request
    ) {

        authz.requireMembership();


        return operationService.verify(
                submissionId,
                request
        );
    }


    // ========================================================================
    // FLAG / UNFLAG
    // ========================================================================

    /**
     * Allowed scopes:
     *
     * CENTER
     * DISTRICT
     * COUNTY
     * MULTI_COUNTY
     * ORGANIZATION
     */
    @PostMapping("/{submissionId}/flag")
    public VoteSubmissionDto flag(
            @PathVariable UUID submissionId,

            @Valid
            @RequestBody
            VoteSubmissionFlagRequest request
    ) {

        authz.requireMembership();


        return operationService.flag(
                submissionId,
                request
        );
    }


    // ========================================================================
    // AMEND
    // ========================================================================

    /**
     * Allowed scopes:
     *
     * COUNTY
     * MULTI_COUNTY
     * ORGANIZATION
     */
    @PostMapping("/{submissionId}/amend")
    public VoteSubmissionDto amend(
            @PathVariable UUID submissionId,

            @Valid
            @RequestBody
            VoteSubmissionAmendRequest request
    ) {

        authz.requireMembership();


        return operationService.amend(
                submissionId,
                request
        );
    }


    // ========================================================================
    // RESUBMIT
    // ========================================================================

    /**
     * Allowed scopes:
     *
     * PLACE
     * CENTER
     *
     * Existing VoteSubmissionService performs:
     *
     * REJECTED -> PENDING
     */
    @PostMapping("/{submissionId}/resubmit")
    public VoteSubmissionDto resubmitRejected(
            @PathVariable UUID submissionId,

            @Valid
            @RequestBody
            VoteSubmissionResubmitRequest request
    ) {

        authz.requireMembership();


        return operationService.resubmitRejected(
                submissionId,
                request
        );
    }


    // ========================================================================
    // REOPEN
    // ========================================================================

    /**
     * Allowed scopes:
     *
     * COUNTY
     * MULTI_COUNTY
     * ORGANIZATION
     *
     * Existing VoteSubmissionService performs:
     *
     * REJECTED -> PENDING
     *
     * without changing vote values.
     */
    @PostMapping("/{submissionId}/reopen")
    public VoteSubmissionDto reopenRejected(
            @PathVariable UUID submissionId,

            @Valid
            @RequestBody
            VoteSubmissionReopenRequest request
    ) {

        authz.requireMembership();


        return operationService.reopenRejected(
                submissionId,
                request
        );
    }


    // ========================================================================
    // DELETE
    // ========================================================================

    /**
     * ORGANIZATION scope only.
     */
    @DeleteMapping("/{submissionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable UUID submissionId,

            @Valid
            @RequestBody
            VoteSubmissionDeleteRequest request
    ) {

        authz.requireMembership();


        operationService.delete(
                submissionId,
                request
        );
    }


    // ========================================================================
    // ACCESS CHECK
    // ========================================================================

    /**
     * Optional lightweight endpoint for UI routing/action visibility.
     *
     * This is NOT the security boundary.
     *
     * Every real action is still authorized by the backend service.
     */
    @GetMapping("/{submissionId}/access")
    public ResponseEntity<Boolean> canAccess(
            @PathVariable UUID submissionId
    ) {

        authz.requireMembership();


        return ResponseEntity.ok(
                operationService.canAccess(
                        submissionId
                )
        );
    }
}