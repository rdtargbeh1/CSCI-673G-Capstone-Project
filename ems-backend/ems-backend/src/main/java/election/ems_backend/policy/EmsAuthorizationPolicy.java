package election.ems_backend.policy;

import election.ems_backend.entity.VoteSubmission;
import election.ems_backend.enums.AssignmentScope;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.UUID;

/**
 * ========================================================================
 * EMS AUTHORIZATION POLICY
 * ========================================================================
 *
 * Central authorization facade.
 *
 * IMPORTANT:
 *
 * Portal access and election access are separate questions.
 *
 * PORTAL:
 *
 *     Administrative roles
 *         -> Administrative Portal
 *
 *     Operational roles
 *         -> Operations Portal
 *
 * Portal selection does NOT require an election.
 *
 * ELECTION-SCOPED OPERATIONS:
 *
 *     role
 *     + organization
 *     + election
 *     + UserElectionAssignment
 *     + scope
 *     + resource geography
 *     + ownership
 *     + workflow state
 *
 * Entity-specific policies remain authoritative for actual records/actions.
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
    // CURRENT ROLE
    // ========================================================================

    public Set<String> currentRoles() {
        return rolePolicy.currentRoles();
    }

    // ========================================================================
    // PORTAL
    // ========================================================================

    /**
     * Administrative portal.
     *
     * No election is required.
     */
    public boolean canAccessAdministrativePortal() {
        return rolePolicy.canAccessAdministrativePortal();
    }

    /**
     * Operations portal.
     *
     * No election is required.
     *
     * This is deliberately different from canUseOperations(electionId).
     */
    public boolean canAccessOperationsPortal() {
        return rolePolicy.canAccessOperationsPortal();
    }

    public EmsPortal currentPortal() {

        if (canAccessAdministrativePortal()) {
            return EmsPortal.ADMINISTRATIVE;
        }

        if (canAccessOperationsPortal()) {
            return EmsPortal.OPERATIONS;
        }

        return EmsPortal.NONE;
    }

    public String defaultPortalRoute() {

        return switch (currentPortal()) {

            case ADMINISTRATIVE ->
                    "/dashboard";

            case OPERATIONS ->
                    "/operations";

            case NONE ->
                    null;
        };
    }

    // ========================================================================
    // LEGACY ADMIN FEATURE GROUPS
    // ========================================================================

    /**
     * EmsFeature represents the existing administrative application modules.
     *
     * Regular operational users no longer gain access to the administrative
     * Elections, Geography Registry, Reports, or Admin & Security portals.
     *
     * Their geography/reference/results/report resources are reached through
     * the dedicated Operations Portal instead.
     */
    public boolean canAccessFeature(
            EmsFeature feature
    ) {

        if (feature == null) {
            return false;
        }

        // --------------------------------------------------------------------
        // ADMINISTRATIVE PORTAL
        // --------------------------------------------------------------------

        if (rolePolicy.isAdministrativeRole()) {
            return true;
        }

        // --------------------------------------------------------------------
        // OPERATIONS PORTAL
        // --------------------------------------------------------------------

        if (!rolePolicy.isOperationalRole()) {
            return false;
        }

        /*
         * Operational roles are not being admitted into the administrative
         * Elections / Geography Registry / Reports modules.
         *
         * They enter through /operations and use scope-limited resource routes.
         */
        return feature == EmsFeature.OPERATIONS;
    }

    public void requireFeature(
            EmsFeature feature
    ) {

        if (!canAccessFeature(feature)) {

            throw new AccessDeniedException(
                    "User role does not have access to feature: " + feature
            );
        }
    }

    // ========================================================================
    // ELECTION-SCOPED OPERATIONS
    // ========================================================================

    /**
     * This answers:
     *
     *     "May this authenticated user operate inside Election X?"
     *
     * It does NOT answer:
     *
     *     "May this user enter the Operations Portal?"
     *
     * Portal eligibility is election-independent.
     */
    public boolean canUseOperations(
            UUID electionId
    ) {

        return rolePolicy.canUseOperations()
                && operationAccessPolicy.hasOperationalAccess(
                electionId
        );
    }

    public AssignmentScope currentOperationScope(
            UUID electionId
    ) {

        if (!canUseOperations(electionId)) {
            return null;
        }

        return operationAccessPolicy.currentScope(
                electionId
        );
    }

    // ========================================================================
    // SUBMISSION FACADE
    // ========================================================================

    public boolean canViewSubmission(
            VoteSubmission submission
    ) {

        return submissionActionPolicy.canView(
                submission
        );
    }

    public boolean canEditSubmission(
            VoteSubmission submission
    ) {

        return submissionActionPolicy.canEdit(
                submission
        );
    }

    public boolean canVerifySubmission(
            VoteSubmission submission
    ) {

        return submissionActionPolicy.canVerify(
                submission
        );
    }

    public boolean canFlagSubmission(
            VoteSubmission submission
    ) {

        return submissionActionPolicy.canFlag(
                submission
        );
    }

    public boolean canAmendSubmission(
            VoteSubmission submission
    ) {

        return submissionActionPolicy.canAmend(
                submission
        );
    }

    public boolean canDeleteSubmission(
            VoteSubmission submission
    ) {

        return submissionActionPolicy.canDelete(
                submission
        );
    }

    public boolean canResubmitSubmission(
            VoteSubmission submission
    ) {

        return submissionActionPolicy.canResubmit(
                submission
        );
    }

    public boolean canReopenSubmission(
            VoteSubmission submission
    ) {

        return submissionActionPolicy.canReopen(
                submission
        );
    }

    // ========================================================================
    // SUPPORTING OPERATIONAL RESOURCES
    // ========================================================================

    public OperationResourcePolicy resources() {
        return operationResourcePolicy;
    }
}







//package election.ems_backend.policy;
//
//import election.ems_backend.entity.VoteSubmission;
//import election.ems_backend.enums.AssignmentScope;
//
//import lombok.RequiredArgsConstructor;
//
//import org.springframework.security.access.AccessDeniedException;
//import org.springframework.stereotype.Component;
//
//import java.util.UUID;
//
///**
// * ========================================================================
// * EMS AUTHORIZATION POLICY
// * ========================================================================
// *
// * Central authorization facade used by controllers/services and, later, by
// * an access-profile endpoint for the shared frontend dashboards.
// *
// * Administrative roles:
// *     SYSTEM_ADMIN, NEC_ADMIN, TENANT_ADMIN, ADMIN
// *     -> all six dashboard feature groups, bounded by platform/org context.
// *
// * Operational roles:
// *     TALLY_OFFICER, AUDITOR, COORDINATOR, OBSERVER, SUPERVISOR,
// *     FIELD_OFFICER, PRESIDING_OFFICER, DATA_ENTRY
// *     -> Dashboard, Elections, Operations, Geography & Registry, Reports.
// *     -> Admin & Security remains hidden/denied.
// *
// * Role answers WHAT; UserElectionAssignment scope answers WHERE.
// * Entity-specific policies still determine record/workflow actions.
// * ========================================================================
// */
//@Component
//@RequiredArgsConstructor
//public class EmsAuthorizationPolicy {
//
//    private final OperationRolePolicy rolePolicy;
//    private final OperationAccessPolicy operationAccessPolicy;
//    private final OperationResourcePolicy operationResourcePolicy;
//    private final OperationSubmissionActionPolicy submissionActionPolicy;
//
//    // ========================================================================
//    // SHARED DASHBOARD FEATURES
//    // ========================================================================
//
//    public boolean canAccessFeature(EmsFeature feature) {
//        if (feature == null) {
//            return false;
//        }
//
//        if (rolePolicy.isAdministrativeRole()) {
//            return true;
//        }
//
//        if (!rolePolicy.isOperationalRole()) {
//            return false;
//        }
//
//        return switch (feature) {
//            case DASHBOARD,
//                 ELECTIONS,
//                 OPERATIONS,
//                 GEOGRAPHY_REGISTRY,
//                 REPORTS -> true;
//
//            case ADMIN_SECURITY -> false;
//        };
//    }
//
//    public void requireFeature(EmsFeature feature) {
//        if (!canAccessFeature(feature)) {
//            throw new AccessDeniedException(
//                    "User role does not have access to feature: " + feature
//            );
//        }
//    }
//
//    // ========================================================================
//    // OPERATIONS CONTEXT
//    // ========================================================================
//
//    public boolean canUseOperations(UUID electionId) {
//        return canAccessFeature(EmsFeature.OPERATIONS)
//                && operationAccessPolicy.hasOperationalAccess(electionId);
//    }
//
//    public AssignmentScope currentOperationScope(UUID electionId) {
//        if (!canUseOperations(electionId)) {
//            return null;
//        }
//        return operationAccessPolicy.currentScope(electionId);
//    }
//
//    // ========================================================================
//    // SUBMISSION FACADE
//    // ========================================================================
//
//    public boolean canViewSubmission(VoteSubmission submission) {
//        return submissionActionPolicy.canView(submission);
//    }
//
//    public boolean canEditSubmission(VoteSubmission submission) {
//        return submissionActionPolicy.canEdit(submission);
//    }
//
//    public boolean canVerifySubmission(VoteSubmission submission) {
//        return submissionActionPolicy.canVerify(submission);
//    }
//
//    public boolean canFlagSubmission(VoteSubmission submission) {
//        return submissionActionPolicy.canFlag(submission);
//    }
//
//    public boolean canAmendSubmission(VoteSubmission submission) {
//        return submissionActionPolicy.canAmend(submission);
//    }
//
//    public boolean canDeleteSubmission(VoteSubmission submission) {
//        return submissionActionPolicy.canDelete(submission);
//    }
//
//    public boolean canResubmitSubmission(VoteSubmission submission) {
//        return submissionActionPolicy.canResubmit(submission);
//    }
//
//    public boolean canReopenSubmission(VoteSubmission submission) {
//        return submissionActionPolicy.canReopen(submission);
//    }
//
//    // ========================================================================
//    // SUPPORTING OPERATIONAL RESOURCES
//    // ========================================================================
//
//    public OperationResourcePolicy resources() {
//        return operationResourcePolicy;
//    }
//}
