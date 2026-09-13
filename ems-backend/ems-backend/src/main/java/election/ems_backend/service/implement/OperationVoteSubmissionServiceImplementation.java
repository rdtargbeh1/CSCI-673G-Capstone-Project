package election.ems_backend.service.implement;

import election.ems_backend.dto.*;
import election.ems_backend.entity.County;
import election.ems_backend.entity.District;
import election.ems_backend.entity.PollingCenter;
import election.ems_backend.entity.PollingPlace;
import election.ems_backend.entity.VoteSubmission;
import election.ems_backend.enums.VoteStatus;
import election.ems_backend.repository.OperationVoteSubmissionRepository;
import election.ems_backend.repository.PollingCenterRepository;
import election.ems_backend.repository.PollingPlaceRepository;
import election.ems_backend.repository.VoteSubmissionRepository;
import election.ems_backend.security.OperationSubmissionActionPolicy;
import election.ems_backend.security.OperationSubmissionAccessPolicy;
import election.ems_backend.service.VoteSubmissionService;
import election.ems_backend.tenant.TenantContext;
import election.ems_backend.utility.VoteSubmissionDeleteRequest;

import jakarta.servlet.http.HttpServletRequest;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;
import java.util.UUID;


/**
 * ========================================================================
 * OPERATION VOTE SUBMISSION SERVICE
 * ========================================================================
 *
 * Operations-specific vote submission service.
 *
 * RESPONSIBILITIES:
 *
 * - enforce Operations geographic access
 * - enforce Operations action matrix
 * - validate authenticated actor identity
 * - delegate actual vote workflow to VoteSubmissionService
 *
 *
 * IMPORTANT:
 *
 * VoteSubmissionService remains responsible for:
 *
 * - ballot validation
 * - vote validation
 * - status transitions
 * - audit history
 * - signing
 * - ledger processing
 * - notifications
 * - NEC result recomputation
 *
 *
 * CURRENT OPERATIONS MODEL:
 *
 * PLACE
 *     create
 *     edit own
 *     view own
 *     resubmit own
 *
 * CENTER
 *     create
 *     edit assigned center submissions
 *     view assigned center submissions
 *     flag
 *     resubmit
 *
 * DISTRICT
 *     view
 *     verify
 *     flag
 *
 * COUNTY
 *     view
 *     edit
 *     verify
 *     flag
 *     amend
 *     reopen
 *
 * MULTI_COUNTY
 *     view
 *     edit
 *     verify
 *     flag
 *     amend
 *     reopen
 *
 * ORGANIZATION
 *     view all organization submissions
 *     edit
 *     verify
 *     flag
 *     amend
 *     delete
 *     reopen
 *
 * ========================================================================
 */
@Service
@RequiredArgsConstructor
public class OperationVoteSubmissionServiceImplementation {

    private final OperationVoteSubmissionRepository operationRepository;

    private final VoteSubmissionRepository voteSubmissionRepository;

    private final PollingCenterRepository pollingCenterRepository;

    private final PollingPlaceRepository pollingPlaceRepository;

    private final OperationSubmissionAccessPolicy submissionAccessPolicy;

    private final OperationSubmissionActionPolicy actionPolicy;

    private final VoteSubmissionService voteSubmissionService;


    // ========================================================================
    // SEARCH
    // ========================================================================

    @Transactional(readOnly = true)
    public Page<VoteSubmission> search(
            UUID electionId,
            VoteStatus status,
            UUID contestId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId,
            Pageable pageable
    ) {

        if (electionId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "electionId is required"
            );
        }


        if (pageable == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "pageable is required"
            );
        }


        UUID userId =
                requireCurrentUserId();


        UUID orgId =
                requireCurrentOrgId();


        return operationRepository.searchOperations(
                userId,
                orgId,
                electionId,
                status,
                contestId,
                countyId,
                districtId,
                centerId,
                placeId,
                pageable
        );
    }


    // ========================================================================
    // GET
    // ========================================================================

    @Transactional(readOnly = true)
    public VoteSubmission getById(
            UUID submissionId
    ) {

        VoteSubmission submission =
                loadSubmission(
                        submissionId
                );


        actionPolicy.requireView(
                submission
        );


        return submission;
    }


    // ========================================================================
    // CREATE - JSON
    // ========================================================================

    @Transactional
    public VoteSubmissionDto create(
            VoteSubmissionCreateRequest request,
            HttpServletRequest httpRequest
    ) {

        validateCreateAccess(
                request
        );


        return voteSubmissionService.create(
                request,
                httpRequest
        );
    }


    // ========================================================================
    // CREATE - MULTIPART
    // ========================================================================

    @Transactional
    public VoteSubmissionDto create(
            VoteSubmissionCreateRequest request,
            List<MultipartFile> files,
            HttpServletRequest httpRequest
    ) {

        validateCreateAccess(
                request
        );


        if (
                files == null
                        ||
                        files.isEmpty()
        ) {

            return voteSubmissionService.create(
                    request,
                    httpRequest
            );
        }


        return voteSubmissionService.create(
                request,
                files,
                httpRequest
        );
    }


    // ========================================================================
    // UPDATE
    // ========================================================================

    @Transactional
    public VoteSubmissionDto update(
            UUID submissionId,
            VoteSubmissionUpdateRequest request,
            List<MultipartFile> files
    ) {

        VoteSubmission submission =
                loadSubmission(
                        submissionId
                );


        actionPolicy.requireEdit(
                submission
        );


        return voteSubmissionService.update(
                submissionId,
                request,
                files
        );
    }


    // ========================================================================
    // SUBMIT DRAFT
    // ========================================================================

    /**
     * Draft submission remains part of the field submission workflow.
     *
     * Only PLACE and CENTER scopes may create submissions, therefore only
     * those scopes may move a DRAFT into the review queue.
     */
    @Transactional
    public VoteSubmissionDto submitDraft(
            UUID submissionId,
            HttpServletRequest request
    ) {

        VoteSubmission submission =
                loadSubmission(
                        submissionId
                );


        requireFieldSubmissionAccess(
                submission
        );


        return voteSubmissionService.submitDraft(
                submissionId,
                request
        );
    }


    // ========================================================================
    // VERIFY / REJECT
    // ========================================================================

    @Transactional
    public VoteSubmissionDto verify(
            UUID submissionId,
            VoteSubmissionVerifyRequest request
    ) {

        VoteSubmission submission =
                loadSubmission(
                        submissionId
                );


        actionPolicy.requireVerify(
                submission
        );


        requireCurrentActor(
                request != null
                        ? request.getVerifierUserId()
                        : null,
                "verifierUserId"
        );


        return voteSubmissionService.verify(
                submissionId,
                request
        );
    }


    // ========================================================================
    // FLAG / UNFLAG
    // ========================================================================

    @Transactional
    public VoteSubmissionDto flag(
            UUID submissionId,
            VoteSubmissionFlagRequest request
    ) {

        VoteSubmission submission =
                loadSubmission(
                        submissionId
                );


        actionPolicy.requireFlag(
                submission
        );


        requireCurrentActor(
                request != null
                        ? request.getActorUserId()
                        : null,
                "actorUserId"
        );


        return voteSubmissionService.flag(
                submissionId,
                request
        );
    }


    // ========================================================================
    // AMEND
    // ========================================================================

    @Transactional
    public VoteSubmissionDto amend(
            UUID submissionId,
            VoteSubmissionAmendRequest request
    ) {

        VoteSubmission submission =
                loadSubmission(
                        submissionId
                );


        actionPolicy.requireAmend(
                submission
        );


        requireCurrentActor(
                request != null
                        ? request.getActorUserId()
                        : null,
                "actorUserId"
        );


        return voteSubmissionService.amend(
                submissionId,
                request
        );
    }


    // ========================================================================
    // RESUBMIT REJECTED
    // ========================================================================

    @Transactional
    public VoteSubmissionDto resubmitRejected(
            UUID submissionId,
            VoteSubmissionResubmitRequest request
    ) {

        VoteSubmission submission =
                loadSubmission(
                        submissionId
                );


        actionPolicy.requireResubmit(
                submission
        );


        requireCurrentActor(
                request != null
                        ? request.getActorUserId()
                        : null,
                "actorUserId"
        );


        return voteSubmissionService.resubmitRejected(
                submissionId,
                request
        );
    }


    // ========================================================================
    // REOPEN REJECTED
    // ========================================================================

    @Transactional
    public VoteSubmissionDto reopenRejected(
            UUID submissionId,
            VoteSubmissionReopenRequest request
    ) {

        VoteSubmission submission =
                loadSubmission(
                        submissionId
                );


        actionPolicy.requireReopen(
                submission
        );


        requireCurrentActor(
                request != null
                        ? request.getActorUserId()
                        : null,
                "actorUserId"
        );


        return voteSubmissionService.reopenRejected(
                submissionId,
                request
        );
    }


    // ========================================================================
    // DELETE
    // ========================================================================

    @Transactional
    public void delete(
            UUID submissionId,
            VoteSubmissionDeleteRequest request
    ) {

        VoteSubmission submission =
                loadSubmission(
                        submissionId
                );


        actionPolicy.requireDelete(
                submission
        );


        voteSubmissionService.delete(
                submissionId,
                request
        );
    }


    // ========================================================================
    // CAN ACCESS
    // ========================================================================

    @Transactional(readOnly = true)
    public boolean canAccess(
            UUID submissionId
    ) {

        if (submissionId == null) {
            return false;
        }


        VoteSubmission submission =
                voteSubmissionRepository
                        .findById(submissionId)
                        .orElse(null);


        if (submission == null) {
            return false;
        }


        return actionPolicy.canView(
                submission
        );
    }


    // ========================================================================
    // OWN SUBMISSION
    // ========================================================================

    @Transactional(readOnly = true)
    public boolean isOwnSubmission(
            UUID submissionId
    ) {

        if (submissionId == null) {
            return false;
        }


        VoteSubmission submission =
                voteSubmissionRepository
                        .findById(submissionId)
                        .orElse(null);


        if (submission == null) {
            return false;
        }


        if (
                !actionPolicy.canView(
                        submission
                )
        ) {

            return false;
        }


        return submissionAccessPolicy.isOwnSubmission(
                submission
        );
    }


    // ========================================================================
    // CREATE ACCESS
    // ========================================================================

    private void validateCreateAccess(
            VoteSubmissionCreateRequest request
    ) {

        if (request == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Request body is required"
            );
        }


        UUID currentUserId =
                requireCurrentUserId();


        UUID currentOrgId =
                requireCurrentOrgId();


        // --------------------------------------------------------------------
        // ORGANIZATION
        // --------------------------------------------------------------------

        if (request.getOrgId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "orgId is required"
            );
        }


        if (
                !Objects.equals(
                        request.getOrgId(),
                        currentOrgId
                )
        ) {

            throw new AccessDeniedException(
                    "Submission organization does not match authenticated organization"
            );
        }


        // --------------------------------------------------------------------
        // AGENT
        // --------------------------------------------------------------------

        if (request.getAgentId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "agentId is required"
            );
        }


        /*
         * A new field submission is created by the authenticated user.
         */
        if (
                !Objects.equals(
                        request.getAgentId(),
                        currentUserId
                )
        ) {

            throw new AccessDeniedException(
                    "agentId must match the authenticated user"
            );
        }


        // --------------------------------------------------------------------
        // ELECTION
        // --------------------------------------------------------------------

        if (request.getElectionId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "electionId is required"
            );
        }


        // --------------------------------------------------------------------
        // CENTER
        // --------------------------------------------------------------------

        if (request.getCenterId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "centerId is required"
            );
        }


        PollingCenter center =
                pollingCenterRepository
                        .findById(request.getCenterId())
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Polling center not found"
                                )
                        );


        // --------------------------------------------------------------------
        // PLACE
        // --------------------------------------------------------------------

        if (request.getPlaceId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "placeId is required"
            );
        }


        PollingPlace place =
                pollingPlaceRepository
                        .findById(request.getPlaceId())
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Polling place not found"
                                )
                        );


        // --------------------------------------------------------------------
        // PLACE -> CENTER
        // --------------------------------------------------------------------

        if (
                place.getPollingCenter() == null
                        ||
                        place.getPollingCenter().getCenterId() == null
                        ||
                        !Objects.equals(
                                place.getPollingCenter().getCenterId(),
                                center.getCenterId()
                        )
        ) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Polling place does not belong to the specified polling center"
            );
        }


        // --------------------------------------------------------------------
        // DISTRICT
        // --------------------------------------------------------------------

        District district =
                center.getDistrict();


        if (
                district == null
                        ||
                        district.getDistrictId() == null
        ) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Polling center is not associated with a district"
            );
        }


        // --------------------------------------------------------------------
        // COUNTY
        // --------------------------------------------------------------------

        County county =
                district.getCounty();


        if (
                county == null
                        ||
                        county.getCountyId() == null
        ) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Polling center district is not associated with a county"
            );
        }


        // --------------------------------------------------------------------
        // ACTION POLICY
        //
        // Only PLACE and CENTER may create.
        // Geography must also be inside the user's assignment.
        // --------------------------------------------------------------------

        actionPolicy.requireCreate(
                request.getElectionId(),
                county.getCountyId(),
                district.getDistrictId(),
                center.getCenterId(),
                place.getPlaceId()
        );
    }


    // ========================================================================
    // FIELD SUBMISSION LIFECYCLE ACCESS
    // ========================================================================

    /**
     * Used for actions that are part of the original field-submission
     * lifecycle, such as submitting a DRAFT.
     *
     * Only PLACE and CENTER scopes are allowed.
     */
    private void requireFieldSubmissionAccess(
            VoteSubmission submission
    ) {

        if (
                submission == null
                        ||
                        submission.getElection() == null
                        ||
                        submission.getPollingCenter() == null
                        ||
                        submission.getPollingPlace() == null
        ) {

            throw new AccessDeniedException(
                    "Submission geography is incomplete"
            );
        }


        PollingCenter center =
                submission.getPollingCenter();


        District district =
                center.getDistrict();


        if (
                district == null
                        ||
                        district.getCounty() == null
        ) {

            throw new AccessDeniedException(
                    "Submission geography is incomplete"
            );
        }


        County county =
                district.getCounty();


        actionPolicy.requireCreate(
                submission
                        .getElection()
                        .getElectionId(),

                county.getCountyId(),

                district.getDistrictId(),

                center.getCenterId(),

                submission
                        .getPollingPlace()
                        .getPlaceId()
        );
    }


    // ========================================================================
    // LOAD SUBMISSION
    // ========================================================================

    private VoteSubmission loadSubmission(
            UUID submissionId
    ) {

        if (submissionId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "submissionId is required"
            );
        }


        return voteSubmissionRepository
                .findById(submissionId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Vote submission not found"
                        )
                );
    }


    // ========================================================================
    // ACTOR
    // ========================================================================

    /**
     * Actor IDs coming from the client must represent the authenticated
     * user performing the Operations action.
     */
    private void requireCurrentActor(
            UUID actorUserId,
            String fieldName
    ) {

        if (actorUserId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    fieldName + " is required"
            );
        }


        UUID currentUserId =
                requireCurrentUserId();


        if (
                !Objects.equals(
                        actorUserId,
                        currentUserId
                )
        ) {

            throw new AccessDeniedException(
                    fieldName + " must match the authenticated user"
            );
        }
    }


    // ========================================================================
    // CURRENT USER
    // ========================================================================

    private UUID requireCurrentUserId() {

        TenantContext context =
                TenantContext.get();


        if (context == null) {
            throw new AccessDeniedException(
                    "Authenticated user context is required"
            );
        }


        return context
                .userId()
                .orElseThrow(() ->
                        new AccessDeniedException(
                                "Authenticated user is required"
                        )
                );
    }


    // ========================================================================
    // CURRENT ORGANIZATION
    // ========================================================================

    private UUID requireCurrentOrgId() {

        TenantContext context =
                TenantContext.get();


        if (context == null) {
            throw new AccessDeniedException(
                    "Organization context is required"
            );
        }


        return context
                .orgId()
                .orElseThrow(() ->
                        new AccessDeniedException(
                                "Organization context is required"
                        )
                );
    }
}