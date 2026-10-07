//package election.ems_backend.controller;
//
//import election.ems_backend.dto.OperationWorkspaceAccessDto;
//import election.ems_backend.enums.AssignmentScope;
//import election.ems_backend.policy.OperationAccessPolicy;
//import election.ems_backend.policy.OperationRolePolicy;
//
//import lombok.RequiredArgsConstructor;
//
//import org.springframework.web.bind.annotation.GetMapping;
//import org.springframework.web.bind.annotation.RequestMapping;
//import org.springframework.web.bind.annotation.RequestParam;
//import org.springframework.web.bind.annotation.RestController;
//
//import java.util.Set;
//import java.util.UUID;
//
///**
// * ========================================================================
// * OPERATION WORKSPACE ACCESS CONTROLLER
// * ========================================================================
// *
// * Provides the frontend with the authenticated user's effective Operations
// * Workspace profile.
// *
// * Endpoint:
// *
// *     GET /api/operations/access-profile
// *
// * Optional:
// *
// *     ?electionId=<uuid>
// *
// *
// * With no electionId:
// *
// *     returns role-family information so the frontend can decide whether
// *     the user belongs to the administrative or operational experience.
// *
// *
// * With electionId:
// *
// *     also resolves:
// *
// *     - active assignment
// *     - effective scope
// *     - visible workspace resource groups
// *     - high-level submission actions
// *     - observer-report actions
// *     - report actions
// *
// *
// * Record-level authorization remains inside the existing resource policies.
// * ========================================================================
// */
//@RestController
//@RequestMapping("/api/operations/access-profile")
//@RequiredArgsConstructor
//public class OperationWorkspaceAccessController {
//
//    private final OperationRolePolicy rolePolicy;
//
//    private final OperationAccessPolicy accessPolicy;
//
//
//    @GetMapping
//    public OperationWorkspaceAccessDto getAccessProfile(
//
//            @RequestParam(required = false)
//            UUID electionId
//
//    ) {
//
//        boolean administrativeRole =
//                rolePolicy.isAdministrativeRole();
//
//        boolean operationalRole =
//                rolePolicy.isOperationalRole();
//
//
//        boolean operationsAvailable =
//                electionId != null
//                        && accessPolicy.hasOperationalAccess(
//                        electionId
//                );
//
//
//        AssignmentScope scope =
//                operationsAvailable
//                        ? accessPolicy.currentScope(
//                        electionId
//                )
//                        : null;
//
//
//        Set<String> roles =
//                rolePolicy.currentRoles();
//
//
//        OperationWorkspaceAccessDto.ScopeIds scopeIds =
//                resolveScopeIds(
//                        electionId,
//                        operationalRole,
//                        operationsAvailable
//                );
//
//
//        OperationWorkspaceAccessDto.ResourceAccess resources =
//                resolveResources(
//                        operationsAvailable
//                );
//
//
//        OperationWorkspaceAccessDto.SubmissionAccess submissions =
//                resolveSubmissionAccess(
//                        operationsAvailable,
//                        scope
//                );
//
//
//        OperationWorkspaceAccessDto.ObserverReportAccess observerReports =
//                resolveObserverReportAccess(
//                        administrativeRole,
//                        operationsAvailable,
//                        scope
//                );
//
//
//        OperationWorkspaceAccessDto.ReportAccess reports =
//                resolveReportAccess(
//                        administrativeRole,
//                        operationsAvailable,
//                        scope
//                );
//
//
//        return new OperationWorkspaceAccessDto(
//                administrativeRole,
//                operationalRole,
//                operationsAvailable,
//                scope,
//                roles,
//                scopeIds,
//                resources,
//                submissions,
//                observerReports,
//                reports
//        );
//    }
//
//
//    // ========================================================================
//    // RESOURCE GROUPS
//    // ========================================================================
//
//    private OperationWorkspaceAccessDto.ResourceAccess resolveResources(
//            boolean operationsAvailable
//    ) {
//
//        if (!operationsAvailable) {
//
//            return new OperationWorkspaceAccessDto.ResourceAccess(
//                    false,
//                    false,
//                    false,
//                    false,
//                    false,
//                    false,
//                    false,
//                    false,
//                    false,
//                    false,
//                    false,
//                    false,
//                    false
//            );
//        }
//
//
//        return new OperationWorkspaceAccessDto.ResourceAccess(
//
//                rolePolicy.canViewGeography(),
//
//                rolePolicy.canViewOperationalContacts(),
//
//                rolePolicy.canViewAllocations(),
//
//                rolePolicy.canViewOperationalReferenceData(),
//
//                rolePolicy.canViewSubmission(),
//
//                rolePolicy.canViewSubmissionHistory(),
//
//                rolePolicy.canViewTallySheets(),
//
//                rolePolicy.canViewVoteTallies(),
//
//                rolePolicy.canViewObserverReports(),
//
//                rolePolicy.canViewDiscrepancies(),
//
//                true,
//
//                rolePolicy.canViewOperationalReferenceData(),
//
//                rolePolicy.canViewScopedReports()
//        );
//    }
//
//
//    // ========================================================================
//    // SUBMISSION ACTION CEILING
//    // ========================================================================
//
//    private OperationWorkspaceAccessDto.SubmissionAccess resolveSubmissionAccess(
//
//            boolean operationsAvailable,
//
//            AssignmentScope scope
//
//    ) {
//
//        if (!operationsAvailable
//                || scope == null) {
//
//            return deniedSubmissionAccess();
//        }
//
//
//        boolean create =
//                rolePolicy.canCreateSubmission()
//                        && (
//                        scope == AssignmentScope.PLACE
//                                ||
//                                scope == AssignmentScope.CENTER
//                );
//
//
//        boolean edit =
//                rolePolicy.canEditSubmission()
//                        && (
//                        scope == AssignmentScope.PLACE
//                                ||
//                                scope == AssignmentScope.CENTER
//                                ||
//                                scope == AssignmentScope.COUNTY
//                                ||
//                                scope == AssignmentScope.MULTI_COUNTY
//                                ||
//                                scope == AssignmentScope.ORGANIZATION
//                );
//
//
//        boolean verify =
//                rolePolicy.canVerifySubmission()
//                        && (
//                        scope == AssignmentScope.DISTRICT
//                                ||
//                                scope == AssignmentScope.COUNTY
//                                ||
//                                scope == AssignmentScope.MULTI_COUNTY
//                                ||
//                                scope == AssignmentScope.ORGANIZATION
//                );
//
//
//        boolean flag =
//                rolePolicy.canFlagSubmission()
//                        && (
//                        scope == AssignmentScope.CENTER
//                                ||
//                                scope == AssignmentScope.DISTRICT
//                                ||
//                                scope == AssignmentScope.COUNTY
//                                ||
//                                scope == AssignmentScope.MULTI_COUNTY
//                                ||
//                                scope == AssignmentScope.ORGANIZATION
//                );
//
//
//        boolean amend =
//                rolePolicy.canAmendSubmission()
//                        && (
//                        scope == AssignmentScope.COUNTY
//                                ||
//                                scope == AssignmentScope.MULTI_COUNTY
//                                ||
//                                scope == AssignmentScope.ORGANIZATION
//                );
//
//
//        boolean delete =
//                rolePolicy.canDeleteSubmission()
//                        && scope == AssignmentScope.ORGANIZATION;
//
//
//        boolean resubmit =
//                rolePolicy.canResubmitSubmission()
//                        && (
//                        scope == AssignmentScope.PLACE
//                                ||
//                                scope == AssignmentScope.CENTER
//                );
//
//
//        boolean reopen =
//                rolePolicy.canReopenSubmission()
//                        && (
//                        scope == AssignmentScope.COUNTY
//                                ||
//                                scope == AssignmentScope.MULTI_COUNTY
//                                ||
//                                scope == AssignmentScope.ORGANIZATION
//                );
//
//
//        return new OperationWorkspaceAccessDto.SubmissionAccess(
//
//                rolePolicy.canViewSubmission(),
//
//                create,
//
//                edit,
//
//                verify,
//
//                flag,
//
//                amend,
//
//                delete,
//
//                resubmit,
//
//                reopen
//        );
//    }
//
//
//    private OperationWorkspaceAccessDto.SubmissionAccess
//    deniedSubmissionAccess() {
//
//        return new OperationWorkspaceAccessDto.SubmissionAccess(
//                false,
//                false,
//                false,
//                false,
//                false,
//                false,
//                false,
//                false,
//                false
//        );
//    }
//
//
//    // ========================================================================
//    // OBSERVER REPORT ACTION CEILING
//    // ========================================================================
//
//    private OperationWorkspaceAccessDto.ObserverReportAccess
//    resolveObserverReportAccess(
//
//            boolean administrativeRole,
//
//            boolean operationsAvailable,
//
//            AssignmentScope scope
//
//    ) {
//
//        if (!operationsAvailable
//                || scope == null) {
//
//            return new OperationWorkspaceAccessDto.ObserverReportAccess(
//                    false,
//                    false,
//                    false,
//                    false
//            );
//        }
//
//
//        boolean delete =
//                rolePolicy.canDeleteObserverReport()
//                        &&
//                        (
//                                administrativeRole
//                                        ||
//                                        scope == AssignmentScope.COUNTY
//                                        ||
//                                        scope == AssignmentScope.MULTI_COUNTY
//                        );
//
//
//        return new OperationWorkspaceAccessDto.ObserverReportAccess(
//
//                rolePolicy.canViewObserverReports(),
//
//                rolePolicy.canCreateObserverReport(),
//
//                rolePolicy.canReviewObserverReports(),
//
//                delete
//        );
//    }
//
//
//    // ========================================================================
//    // REPORT ACTION CEILING
//    // ========================================================================
//
//    private OperationWorkspaceAccessDto.ReportAccess
//    resolveReportAccess(
//
//            boolean administrativeRole,
//
//            boolean operationsAvailable,
//
//            AssignmentScope scope
//
//    ) {
//
//        if (!operationsAvailable
//                || scope == null) {
//
//            return new OperationWorkspaceAccessDto.ReportAccess(
//                    false,
//                    false,
//                    false
//            );
//        }
//
//
//        boolean operationalCreateScope =
//                scope == AssignmentScope.CENTER
//                        ||
//                        scope == AssignmentScope.DISTRICT
//                        ||
//                        scope == AssignmentScope.COUNTY
//                        ||
//                        scope == AssignmentScope.MULTI_COUNTY;
//
//
//        boolean create =
//                rolePolicy.canGenerateScopedReports()
//                        &&
//                        (
//                                administrativeRole
//                                        ||
//                                        operationalCreateScope
//                        );
//
//
//        return new OperationWorkspaceAccessDto.ReportAccess(
//
//                rolePolicy.canViewScopedReports(),
//
//                create,
//
//                rolePolicy.canViewScopedReports()
//        );
//    }
//
//
//    // ========================================================================
//    // RAW ASSIGNMENT IDS
//    // ========================================================================
//
//    private OperationWorkspaceAccessDto.ScopeIds resolveScopeIds(
//
//            UUID electionId,
//
//            boolean operationalRole,
//
//            boolean operationsAvailable
//
//    ) {
//
//        if (!operationalRole
//                || !operationsAvailable
//                || electionId == null) {
//
//            return new OperationWorkspaceAccessDto.ScopeIds(
//                    Set.of(),
//                    Set.of(),
//                    Set.of(),
//                    Set.of()
//            );
//        }
//
//
//        return new OperationWorkspaceAccessDto.ScopeIds(
//
//                accessPolicy.assignedCountyIds(
//                        electionId
//                ),
//
//                accessPolicy.assignedDistrictIds(
//                        electionId
//                ),
//
//                accessPolicy.assignedCenterIds(
//                        electionId
//                ),
//
//                accessPolicy.assignedPlaceIds(
//                        electionId
//                )
//        );
//    }
//}