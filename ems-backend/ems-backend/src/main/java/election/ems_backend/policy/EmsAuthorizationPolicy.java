package election.ems_backend.policy;

import election.ems_backend.entity.VoteSubmission;
import election.ems_backend.enums.AssignmentScope;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * ========================================================================
 * EMS AUTHORIZATION POLICY
 * ========================================================================
 *
 * Central authorization facade used by controllers/services and, later, by
 * an access-profile endpoint for the shared frontend dashboards.
 *
 * Administrative roles:
 *     SYSTEM_ADMIN, NEC_ADMIN, TENANT_ADMIN, ADMIN
 *     -> all six dashboard feature groups, bounded by platform/org context.
 *
 * Operational roles:
 *     TALLY_OFFICER, AUDITOR, COORDINATOR, OBSERVER, SUPERVISOR,
 *     FIELD_OFFICER, PRESIDING_OFFICER, DATA_ENTRY
 *     -> Dashboard, Elections, Operations, Geography & Registry, Reports.
 *     -> Admin & Security remains hidden/denied.
 *
 * Role answers WHAT; UserElectionAssignment scope answers WHERE.
 * Entity-specific policies still determine record/workflow actions.
 * ========================================================================
 */
@Component
@RequiredArgsConstructor
public class EmsAuthorizationPolicy {

    private final OperationRolePolicy rolePolicy;
    private final OperationAccessPolicy operationAccessPolicy;
    private final OperationResourcePolicy operationResourcePolicy;
    private final OperationSubmissionActionPolicy submissionActionPolicy;

    // ========================================================================
    // SHARED DASHBOARD FEATURES
    // ========================================================================

    public boolean canAccessFeature(EmsFeature feature) {
        if (feature == null) {
            return false;
        }

        if (rolePolicy.isAdministrativeRole()) {
            return true;
        }

        if (!rolePolicy.isOperationalRole()) {
            return false;
        }

        return switch (feature) {
            case DASHBOARD,
                 ELECTIONS,
                 OPERATIONS,
                 GEOGRAPHY_REGISTRY,
                 REPORTS -> true;

            case ADMIN_SECURITY -> false;
        };
    }

    public void requireFeature(EmsFeature feature) {
        if (!canAccessFeature(feature)) {
            throw new AccessDeniedException(
                    "User role does not have access to feature: " + feature
            );
        }
    }

    // ========================================================================
    // OPERATIONS CONTEXT
    // ========================================================================

    public boolean canUseOperations(UUID electionId) {
        return canAccessFeature(EmsFeature.OPERATIONS)
                && operationAccessPolicy.hasOperationalAccess(electionId);
    }

    public AssignmentScope currentOperationScope(UUID electionId) {
        if (!canUseOperations(electionId)) {
            return null;
        }
        return operationAccessPolicy.currentScope(electionId);
    }

    // ========================================================================
    // SUBMISSION FACADE
    // ========================================================================

    public boolean canViewSubmission(VoteSubmission submission) {
        return submissionActionPolicy.canView(submission);
    }

    public boolean canEditSubmission(VoteSubmission submission) {
        return submissionActionPolicy.canEdit(submission);
    }

    public boolean canVerifySubmission(VoteSubmission submission) {
        return submissionActionPolicy.canVerify(submission);
    }

    public boolean canFlagSubmission(VoteSubmission submission) {
        return submissionActionPolicy.canFlag(submission);
    }

    public boolean canAmendSubmission(VoteSubmission submission) {
        return submissionActionPolicy.canAmend(submission);
    }

    public boolean canDeleteSubmission(VoteSubmission submission) {
        return submissionActionPolicy.canDelete(submission);
    }

    public boolean canResubmitSubmission(VoteSubmission submission) {
        return submissionActionPolicy.canResubmit(submission);
    }

    public boolean canReopenSubmission(VoteSubmission submission) {
        return submissionActionPolicy.canReopen(submission);
    }

    // ========================================================================
    // SUPPORTING OPERATIONAL RESOURCES
    // ========================================================================

    public OperationResourcePolicy resources() {
        return operationResourcePolicy;
    }
}
