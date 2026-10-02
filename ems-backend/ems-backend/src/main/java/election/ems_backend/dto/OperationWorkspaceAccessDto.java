//package election.ems_backend.dto;
//
//import election.ems_backend.enums.AssignmentScope;
//
//import java.util.Set;
//import java.util.UUID;
//
///**
// * ========================================================================
// * OPERATION WORKSPACE ACCESS DTO
// * ========================================================================
// *
// * Backend-driven access profile for the Operations Workspace.
// *
// * IMPORTANT:
// *
// * This DTO tells the frontend:
// *
// * - whether the authenticated user belongs to the administrative family
// * - whether the authenticated user belongs to the operational family
// * - whether the user has an active assignment for the selected election
// * - the effective assignment scope
// * - which Operations Workspace resources should appear
// * - high-level action capability for the three actionable resource families:
// *
// *      Vote Submission
// *      Observer Report
// *      Reports
// *
// *
// * This DTO does NOT replace record-level authorization.
// *
// * Individual backend policies remain authoritative for:
// *
// * - ownership
// * - exact geography
// * - resource state
// * - workflow state
// * - parent-resource access
// * ========================================================================
// */
//public record OperationWorkspaceAccessDto(
//
//        boolean administrativeRole,
//
//        boolean operationalRole,
//
//        boolean operationsAvailable,
//
//        AssignmentScope scope,
//
//        Set<String> roles,
//
//        ScopeIds scopeIds,
//
//        ResourceAccess resources,
//
//        SubmissionAccess submissions,
//
//        ObserverReportAccess observerReports,
//
//        ReportAccess reports
//
//) {
//
//    public record ScopeIds(
//
//            Set<UUID> countyIds,
//
//            Set<UUID> districtIds,
//
//            Set<UUID> centerIds,
//
//            Set<UUID> placeIds
//
//    ) {
//    }
//
//
//    public record ResourceAccess(
//
//            boolean geography,
//
//            boolean personnel,
//
//            boolean allocations,
//
//            boolean electionReference,
//
//            boolean submissions,
//
//            boolean submissionActions,
//
//            boolean tallySheets,
//
//            boolean voteTallies,
//
//            boolean observerReports,
//
//            boolean discrepancies,
//
//            boolean notifications,
//
//            boolean results,
//
//            boolean reports
//
//    ) {
//    }
//
//
//    public record SubmissionAccess(
//
//            boolean view,
//
//            boolean create,
//
//            boolean edit,
//
//            boolean verify,
//
//            boolean flag,
//
//            boolean amend,
//
//            boolean delete,
//
//            boolean resubmit,
//
//            boolean reopen
//
//    ) {
//    }
//
//
//    public record ObserverReportAccess(
//
//            boolean view,
//
//            boolean create,
//
//            boolean review,
//
//            boolean delete
//
//    ) {
//    }
//
//
//    public record ReportAccess(
//
//            boolean view,
//
//            boolean create,
//
//            boolean viewFiles
//
//    ) {
//    }
//}