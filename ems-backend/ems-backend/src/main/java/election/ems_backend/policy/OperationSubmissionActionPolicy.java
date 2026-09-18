package election.ems_backend.policy;

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
 * Final action decision = role authority + scope authority + resource access.
 *
 * The existing scope matrix is preserved. Role authority now prevents a wide
 * assignment from accidentally granting actions that the user's job does not
 * permit (for example an ORGANIZATION-scoped AUDITOR remains read-only).
 * ========================================================================
 */
@Component
@RequiredArgsConstructor
public class OperationSubmissionActionPolicy {

    private final OperationAccessPolicy operationAccessPolicy;
    private final OperationSubmissionAccessPolicy submissionAccessPolicy;
    private final OperationRolePolicy rolePolicy;

    public boolean canView(VoteSubmission submission) {
        return rolePolicy.canViewSubmission()
                && submissionAccessPolicy.canAccess(submission);
    }

    public void requireView(VoteSubmission submission) {
        if (!canView(submission)) {
            throw new AccessDeniedException(
                    "User does not have permission to view this submission"
            );
        }
    }

    /**
     * Existing domain rule remains unchanged: vote submissions originate at a
     * polling place, therefore CREATE is available only to PLACE/CENTER scope.
     * Administrative organization scope does not originate field submissions.
     */
    public boolean canCreate(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {
        if (!rolePolicy.canCreateSubmission()
                || electionId == null
                || countyId == null
                || districtId == null
                || centerId == null
                || placeId == null) {
            return false;
        }

        AssignmentScope scope = operationAccessPolicy.currentScope(electionId);

        if (scope != AssignmentScope.PLACE && scope != AssignmentScope.CENTER) {
            return false;
        }

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
        if (!canCreate(electionId, countyId, districtId, centerId, placeId)) {
            throw new AccessDeniedException(
                    "User does not have permission to create a submission for this polling place"
            );
        }
    }

    public boolean canEdit(VoteSubmission submission) {
        if (!rolePolicy.canEditSubmission()
                || !submissionAccessPolicy.canAccess(submission)) {
            return false;
        }

        AssignmentScope scope = accessibleScope(submission);
        if (scope == null) {
            return false;
        }

        return switch (scope) {
            case PLACE -> submissionAccessPolicy.isOwnSubmission(submission);
            case CENTER -> true;
            case DISTRICT -> false;
            case COUNTY, MULTI_COUNTY, ORGANIZATION -> true;
        };
    }

    public void requireEdit(VoteSubmission submission) {
        if (!canEdit(submission)) {
            throw new AccessDeniedException(
                    "User does not have permission to edit this submission"
            );
        }
    }

    public boolean canVerify(VoteSubmission submission) {
        if (!rolePolicy.canVerifySubmission()) {
            return false;
        }

        AssignmentScope scope = accessibleScope(submission);
        if (scope == null) {
            return false;
        }

        return switch (scope) {
            case PLACE, CENTER -> false;
            case DISTRICT, COUNTY, MULTI_COUNTY, ORGANIZATION -> true;
        };
    }

    public void requireVerify(VoteSubmission submission) {
        if (!canVerify(submission)) {
            throw new AccessDeniedException(
                    "User does not have permission to verify or reject this submission"
            );
        }
    }

    public boolean canFlag(VoteSubmission submission) {
        if (!rolePolicy.canFlagSubmission()) {
            return false;
        }

        AssignmentScope scope = accessibleScope(submission);
        if (scope == null) {
            return false;
        }

        return switch (scope) {
            case PLACE -> false;
            case CENTER, DISTRICT, COUNTY, MULTI_COUNTY, ORGANIZATION -> true;
        };
    }

    public void requireFlag(VoteSubmission submission) {
        if (!canFlag(submission)) {
            throw new AccessDeniedException(
                    "User does not have permission to flag or unflag this submission"
            );
        }
    }

    public boolean canAmend(VoteSubmission submission) {
        if (!rolePolicy.canAmendSubmission()) {
            return false;
        }

        AssignmentScope scope = accessibleScope(submission);
        if (scope == null) {
            return false;
        }

        return switch (scope) {
            case PLACE, CENTER, DISTRICT -> false;
            case COUNTY, MULTI_COUNTY, ORGANIZATION -> true;
        };
    }

    public void requireAmend(VoteSubmission submission) {
        if (!canAmend(submission)) {
            throw new AccessDeniedException(
                    "User does not have permission to amend this submission"
            );
        }
    }

    public boolean canDelete(VoteSubmission submission) {
        if (!rolePolicy.canDeleteSubmission()) {
            return false;
        }

        AssignmentScope scope = accessibleScope(submission);
        return scope == AssignmentScope.ORGANIZATION;
    }

    public void requireDelete(VoteSubmission submission) {
        if (!canDelete(submission)) {
            throw new AccessDeniedException(
                    "User does not have permission to delete this submission"
            );
        }
    }

    public boolean canResubmit(VoteSubmission submission) {
        if (!rolePolicy.canResubmitSubmission()
                || !submissionAccessPolicy.canAccess(submission)) {
            return false;
        }

        AssignmentScope scope = accessibleScope(submission);
        if (scope == null) {
            return false;
        }

        return switch (scope) {
            case PLACE -> submissionAccessPolicy.isOwnSubmission(submission);
            case CENTER -> true;
            case DISTRICT, COUNTY, MULTI_COUNTY, ORGANIZATION -> false;
        };
    }

    public void requireResubmit(VoteSubmission submission) {
        if (!canResubmit(submission)) {
            throw new AccessDeniedException(
                    "User does not have permission to resubmit this submission"
            );
        }
    }

    public boolean canReopen(VoteSubmission submission) {
        if (!rolePolicy.canReopenSubmission()) {
            return false;
        }

        AssignmentScope scope = accessibleScope(submission);
        if (scope == null) {
            return false;
        }

        return switch (scope) {
            case PLACE, CENTER, DISTRICT -> false;
            case COUNTY, MULTI_COUNTY, ORGANIZATION -> true;
        };
    }

    public void requireReopen(VoteSubmission submission) {
        if (!canReopen(submission)) {
            throw new AccessDeniedException(
                    "User does not have permission to reopen this submission"
            );
        }
    }

    private AssignmentScope accessibleScope(VoteSubmission submission) {
        if (submission == null || !submissionAccessPolicy.canAccess(submission)) {
            return null;
        }

        UUID electionId = resolveElectionId(submission);
        if (electionId == null) {
            return null;
        }

        return operationAccessPolicy.currentScope(electionId);
    }

    private UUID resolveElectionId(VoteSubmission submission) {
        if (submission == null
                || submission.getElection() == null
                || submission.getElection().getElectionId() == null) {
            return null;
        }

        return submission.getElection().getElectionId();
    }
}
