package election.ems_backend.security;

import election.ems_backend.entity.VoteSubmission;
import election.ems_backend.enums.AssignmentScope;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.UUID;


/**
 * ========================================================================
 * OPERATION SUBMISSION ACTION POLICY
 * ========================================================================
 *
 * Controls WHAT an Operations user may do to vote submissions based on
 * their election assignment scope.
 *
 *
 * IMPORTANT DOMAIN RULE
 *
 * Vote submissions originate at the POLLING PLACE.
 *
 * Higher geography levels do not represent submission sources.
 * They represent supervisory / administrative responsibility.
 *
 *
 * CURRENT ACTION MATRIX
 *
 * PLACE
 *     Create      YES
 *     Edit        own submission only
 *     View        own submission only
 *     Verify      NO
 *     Flag        NO
 *     Amend       NO
 *     Delete      NO
 *     Resubmit    own submission
 *     Reopen      NO
 *
 * CENTER
 *     Create      YES
 *     Edit        submissions within assigned center(s)
 *     View        submissions within assigned center(s)
 *     Verify      NO
 *     Flag        YES
 *     Amend       NO
 *     Delete      NO
 *     Resubmit    YES
 *     Reopen      NO
 *
 * DISTRICT
 *     Create      NO
 *     Edit        NO
 *     View        submissions within assigned district
 *     Verify      YES
 *     Flag        YES
 *     Amend       NO
 *     Delete      NO
 *     Resubmit    NO
 *     Reopen      NO
 *
 * COUNTY
 *     Create      NO
 *     Edit        submissions within assigned county
 *     View        submissions within assigned county
 *     Verify      YES
 *     Flag        YES
 *     Amend       YES
 *     Delete      NO
 *     Resubmit    NO
 *     Reopen      YES
 *
 * MULTI_COUNTY
 *     Create      NO
 *     Edit        submissions within assigned counties
 *     View        submissions within assigned counties
 *     Verify      YES
 *     Flag        YES
 *     Amend       YES
 *     Delete      NO
 *     Resubmit    NO
 *     Reopen      YES
 *
 * ORGANIZATION
 *     Create      NO
 *     Edit        all accessible organization submissions
 *     View        all organization submissions
 *     Verify      YES
 *     Flag        YES
 *     Amend       YES
 *     Delete      YES
 *     Resubmit    NO
 *     Reopen      YES
 *
 *
 * ACCESS MODEL
 *
 * OperationAccessPolicy
 *     -> WHERE the user is geographically assigned.
 *
 * OperationSubmissionAccessPolicy
 *     -> WHICH existing submissions are inside that assignment.
 *
 * OperationSubmissionActionPolicy
 *     -> WHAT actions that scope may perform.
 * ========================================================================
 */
@Component
@RequiredArgsConstructor
public class OperationSubmissionActionPolicy {

    private final OperationAccessPolicy operationAccessPolicy;

    private final OperationSubmissionAccessPolicy submissionAccessPolicy;


    // ========================================================================
    // VIEW
    // ========================================================================

    /**
     * Viewing is controlled entirely by geographic submission access.
     *
     * PLACE remains own-submission only because that rule is already
     * enforced by OperationSubmissionAccessPolicy.
     */
    public boolean canView(
            VoteSubmission submission
    ) {

        return submissionAccessPolicy.canAccess(
                submission
        );
    }


    public void requireView(
            VoteSubmission submission
    ) {

        if (!canView(submission)) {

            throw new AccessDeniedException(
                    "User does not have permission to view this submission"
            );
        }
    }


    // ========================================================================
    // CREATE
    // ========================================================================

    /**
     * Only field-level scopes create vote submissions:
     *
     * PLACE
     * CENTER
     *
     * A submission still originates from a polling place.
     *
     * CENTER users may create for polling places located beneath one of
     * their assigned centers.
     *
     * PLACE users may create only for their assigned polling place.
     */
    public boolean canCreate(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {

        if (
                electionId == null
                        ||
                        countyId == null
                        ||
                        districtId == null
                        ||
                        centerId == null
                        ||
                        placeId == null
        ) {

            return false;
        }


        AssignmentScope scope =
                operationAccessPolicy.currentScope(
                        electionId
                );


        if (
                scope != AssignmentScope.PLACE
                        &&
                        scope != AssignmentScope.CENTER
        ) {

            return false;
        }


        /*
         * canAccessPlace() verifies the complete geographic chain against
         * the user's actual assignment.
         *
         * PLACE:
         *     must be the assigned place.
         *
         * CENTER:
         *     place must fall beneath an assigned center.
         */
        return operationAccessPolicy.canAccessPlace(
                electionId,
                countyId,
                districtId,
                centerId,
                placeId
        );
    }


    public void requireCreate(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {

        if (
                !canCreate(
                        electionId,
                        countyId,
                        districtId,
                        centerId,
                        placeId
                )
        ) {

            throw new AccessDeniedException(
                    "User does not have permission to create a submission for this polling place"
            );
        }
    }


    // ========================================================================
    // EDIT
    // ========================================================================

    public boolean canEdit(
            VoteSubmission submission
    ) {

        if (
                !submissionAccessPolicy.canAccess(
                        submission
                )
        ) {

            return false;
        }


        UUID electionId =
                resolveElectionId(
                        submission
                );


        if (electionId == null) {
            return false;
        }


        AssignmentScope scope =
                operationAccessPolicy.currentScope(
                        electionId
                );


        if (scope == null) {
            return false;
        }


        return switch (scope) {

            /*
             * PLACE officer may edit only the submission that belongs
             * to that officer.
             *
             * OperationSubmissionAccessPolicy already enforces:
             *
             * assigned place
             * AND
             * submission.agent == current user
             */
            case PLACE ->
                    submissionAccessPolicy.isOwnSubmission(
                            submission
                    );


            /*
             * CENTER supervisor may edit submissions from any polling
             * place underneath the assigned center(s).
             */
            case CENTER ->
                    true;


            /*
             * District officers review/verify/flag but do not edit
             * submission vote data.
             */
            case DISTRICT ->
                    false;


            /*
             * Administrative geography levels may edit submissions
             * inside their authorized geographic scope.
             */
            case COUNTY,
                 MULTI_COUNTY,
                 ORGANIZATION ->
                    true;
        };
    }


    public void requireEdit(
            VoteSubmission submission
    ) {

        if (!canEdit(submission)) {

            throw new AccessDeniedException(
                    "User does not have permission to edit this submission"
            );
        }
    }


    // ========================================================================
    // VERIFY / REJECT
    // ========================================================================

    public boolean canVerify(
            VoteSubmission submission
    ) {

        AssignmentScope scope =
                accessibleScope(
                        submission
                );


        if (scope == null) {
            return false;
        }


        return switch (scope) {

            case PLACE,
                 CENTER ->
                    false;

            case DISTRICT,
                 COUNTY,
                 MULTI_COUNTY,
                 ORGANIZATION ->
                    true;
        };
    }


    public void requireVerify(
            VoteSubmission submission
    ) {

        if (!canVerify(submission)) {

            throw new AccessDeniedException(
                    "User does not have permission to verify or reject this submission"
            );
        }
    }


    // ========================================================================
    // FLAG / UNFLAG
    // ========================================================================

    public boolean canFlag(
            VoteSubmission submission
    ) {

        AssignmentScope scope =
                accessibleScope(
                        submission
                );


        if (scope == null) {
            return false;
        }


        return switch (scope) {

            case PLACE ->
                    false;

            case CENTER,
                 DISTRICT,
                 COUNTY,
                 MULTI_COUNTY,
                 ORGANIZATION ->
                    true;
        };
    }


    public void requireFlag(
            VoteSubmission submission
    ) {

        if (!canFlag(submission)) {

            throw new AccessDeniedException(
                    "User does not have permission to flag or unflag this submission"
            );
        }
    }


    // ========================================================================
    // AMEND
    // ========================================================================

    public boolean canAmend(
            VoteSubmission submission
    ) {

        AssignmentScope scope =
                accessibleScope(
                        submission
                );


        if (scope == null) {
            return false;
        }


        return switch (scope) {

            case PLACE,
                 CENTER,
                 DISTRICT ->
                    false;

            case COUNTY,
                 MULTI_COUNTY,
                 ORGANIZATION ->
                    true;
        };
    }


    public void requireAmend(
            VoteSubmission submission
    ) {

        if (!canAmend(submission)) {

            throw new AccessDeniedException(
                    "User does not have permission to amend this submission"
            );
        }
    }


    // ========================================================================
    // DELETE
    // ========================================================================

    public boolean canDelete(
            VoteSubmission submission
    ) {

        AssignmentScope scope =
                accessibleScope(
                        submission
                );


        return scope == AssignmentScope.ORGANIZATION;
    }


    public void requireDelete(
            VoteSubmission submission
    ) {

        if (!canDelete(submission)) {

            throw new AccessDeniedException(
                    "User does not have permission to delete this submission"
            );
        }
    }


    // ========================================================================
    // RESUBMIT
    // ========================================================================

    /**
     * Current rule:
     *
     * PLACE
     *     -> may resubmit own rejected submission.
     *
     * CENTER
     *     -> may resubmit rejected submissions within assigned center(s).
     *
     * Higher administrative scopes do not use RESUBMIT.
     */
    public boolean canResubmit(
            VoteSubmission submission
    ) {

        if (
                !submissionAccessPolicy.canAccess(
                        submission
                )
        ) {

            return false;
        }


        UUID electionId =
                resolveElectionId(
                        submission
                );


        if (electionId == null) {
            return false;
        }


        AssignmentScope scope =
                operationAccessPolicy.currentScope(
                        electionId
                );


        if (scope == null) {
            return false;
        }


        return switch (scope) {

            case PLACE ->
                    submissionAccessPolicy.isOwnSubmission(
                            submission
                    );

            case CENTER ->
                    true;

            case DISTRICT,
                 COUNTY,
                 MULTI_COUNTY,
                 ORGANIZATION ->
                    false;
        };
    }


    public void requireResubmit(
            VoteSubmission submission
    ) {

        if (!canResubmit(submission)) {

            throw new AccessDeniedException(
                    "User does not have permission to resubmit this submission"
            );
        }
    }


    // ========================================================================
    // REOPEN
    // ========================================================================

    public boolean canReopen(
            VoteSubmission submission
    ) {

        AssignmentScope scope =
                accessibleScope(
                        submission
                );


        if (scope == null) {
            return false;
        }


        return switch (scope) {

            case PLACE,
                 CENTER,
                 DISTRICT ->
                    false;

            case COUNTY,
                 MULTI_COUNTY,
                 ORGANIZATION ->
                    true;
        };
    }


    public void requireReopen(
            VoteSubmission submission
    ) {

        if (!canReopen(submission)) {

            throw new AccessDeniedException(
                    "User does not have permission to reopen this submission"
            );
        }
    }


    // ========================================================================
    // ACCESSIBLE SCOPE
    // ========================================================================

    /**
     * Common helper for existing-submission actions.
     *
     * Before checking whether a scope supports an action, the submission
     * itself must first belong to that user's authorized Operations area.
     */
    private AssignmentScope accessibleScope(
            VoteSubmission submission
    ) {

        if (
                submission == null
                        ||
                        !submissionAccessPolicy.canAccess(
                                submission
                        )
        ) {

            return null;
        }


        UUID electionId =
                resolveElectionId(
                        submission
                );


        if (electionId == null) {
            return null;
        }


        return operationAccessPolicy.currentScope(
                electionId
        );
    }


    // ========================================================================
    // ELECTION
    // ========================================================================

    private UUID resolveElectionId(
            VoteSubmission submission
    ) {

        if (
                submission == null
                        ||
                        submission.getElection() == null
                        ||
                        submission
                                .getElection()
                                .getElectionId() == null
        ) {

            return null;
        }


        return submission
                .getElection()
                .getElectionId();
    }
}