package election.ems_backend.policy;

import election.ems_backend.entity.VoteSubmission;
import election.ems_backend.enums.AssignmentScope;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.Objects;
import java.util.UUID;

/**
 * ========================================================================
 * OPERATION RESOURCE POLICY
 * ========================================================================
 *
 * Shared resource access rules for the Operations workspace.
 *
 * Supporting resources are read-only for regular operational users except:
 *
 * - VoteSubmission
 * - ObserverReport
 * - Report
 *
 * Those three resources have explicit operational action policies.
 *
 * IMPORTANT DISTINCTION:
 *
 * Reference visibility:
 *     A lower-level user may see parent geography needed to understand and
 *     navigate their assignment.
 *
 * Resource authority:
 *     A lower-level user cannot act on a parent-level resource merely because
 *     that parent is visible as reference data.
 *
 * Example:
 *
 *     DISTRICT user may SEE parent COUNTY name
 *     but cannot CREATE a COUNTY-level report.
 * ========================================================================
 */
@Component
@RequiredArgsConstructor
public class OperationResourcePolicy {

    private final OperationRolePolicy rolePolicy;

    private final OperationAccessPolicy accessPolicy;

    private final OperationSubmissionAccessPolicy submissionAccessPolicy;

    // ========================================================================
    // ELECTION REFERENCE
    // ========================================================================

    public boolean canViewElectionReference(
            UUID electionId
    ) {

        return rolePolicy.canViewOperationalReferenceData()
                && accessPolicy.hasOperationalAccess(electionId);
    }

    // ========================================================================
    // GEOGRAPHY
    // ========================================================================

    public boolean canViewCounty(
            UUID electionId,
            UUID countyId
    ) {

        return rolePolicy.canViewGeography()
                && accessPolicy.canViewCountyReference(
                electionId,
                countyId
        );
    }

    public boolean canViewDistrict(
            UUID electionId,
            UUID countyId,
            UUID districtId
    ) {

        return rolePolicy.canViewGeography()
                && accessPolicy.canViewDistrictReference(
                electionId,
                countyId,
                districtId
        );
    }

    public boolean canViewCenter(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId
    ) {

        return rolePolicy.canViewGeography()
                && accessPolicy.canViewCenterReference(
                electionId,
                countyId,
                districtId,
                centerId
        );
    }

    public boolean canViewPlace(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {

        return rolePolicy.canViewGeography()
                && accessPolicy.canViewPlaceReference(
                electionId,
                countyId,
                districtId,
                centerId,
                placeId
        );
    }

    // ========================================================================
    // ALLOCATIONS
    // ========================================================================

    public boolean canViewAllocation(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {

        return rolePolicy.canViewAllocations()
                && canViewScopedReference(
                electionId,
                countyId,
                districtId,
                centerId,
                placeId
        );
    }

    // ========================================================================
    // CONTEST / PARTY / CANDIDATE
    // ========================================================================

    public boolean canViewContest(
            UUID electionId,
            UUID countyId,
            UUID districtId
    ) {

        if (!rolePolicy.canViewOperationalReferenceData()) {
            return false;
        }

        /*
         * NATIONAL contest/reference.
         */
        if (
                countyId == null
                        && districtId == null
        ) {

            return accessPolicy.hasOperationalAccess(
                    electionId
            );
        }

        if (districtId != null) {

            return accessPolicy.canViewDistrictReference(
                    electionId,
                    countyId,
                    districtId
            );
        }

        return accessPolicy.canViewCountyReference(
                electionId,
                countyId
        );
    }

    public boolean canViewElectionParty(
            UUID electionId
    ) {

        return canViewElectionReference(
                electionId
        );
    }

    public boolean canViewElectionCandidate(
            UUID electionId
    ) {

        return canViewElectionReference(
                electionId
        );
    }

    // ========================================================================
    // SUBMISSION CHILD RESOURCES
    // ========================================================================

    public boolean canViewVoteSubmissionAction(
            VoteSubmission submission
    ) {

        return rolePolicy.canViewSubmissionHistory()
                && submissionAccessPolicy.canAccess(
                submission
        );
    }

    public boolean canViewTallySheet(
            VoteSubmission submission
    ) {

        return rolePolicy.canViewTallySheets()
                && submissionAccessPolicy.canAccess(
                submission
        );
    }

    // ========================================================================
    // VOTE TALLIES
    // ========================================================================

    /**
     * Generic tally visibility helper.
     *
     * Aggregate-specific services must still apply the established aggregate
     * safety rule before exposing broader result universes.
     */
    public boolean canViewVoteTally(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {

        return rolePolicy.canViewVoteTallies()
                && canViewScopedReference(
                electionId,
                countyId,
                districtId,
                centerId,
                placeId
        );
    }

    // ========================================================================
    // OBSERVER REPORTS
    // ========================================================================

    /**
     * Uses actual downward operational reach, not merely parent-reference
     * visibility.
     *
     * PLACE ownership is handled by OperationObserverReportPolicy because the
     * ObserverReport entity currently has no placeId.
     */
    public boolean canViewObserverReport(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {

        return rolePolicy.canViewObserverReports()
                && canAccessOperationalLocation(
                electionId,
                countyId,
                districtId,
                centerId,
                placeId
        );
    }

    public boolean canCreateObserverReport(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {

        return rolePolicy.canCreateObserverReport()
                && canAccessOperationalLocation(
                electionId,
                countyId,
                districtId,
                centerId,
                placeId
        );
    }

    // ========================================================================
    // DISCREPANCIES
    // ========================================================================

    public boolean canViewDiscrepancy(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {

        return rolePolicy.canViewDiscrepancies()
                && canAccessOperationalLocation(
                electionId,
                countyId,
                districtId,
                centerId,
                placeId
        );
    }

    /**
     * Operational users are read-only.
     *
     * OperationRolePolicy.canManageDiscrepancies() now succeeds only for
     * administrative roles.
     */
    public boolean canManageDiscrepancy(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {

        return rolePolicy.canManageDiscrepancies()
                && canAccessOperationalLocation(
                electionId,
                countyId,
                districtId,
                centerId,
                placeId
        );
    }

    // ========================================================================
    // PERSONNEL / OPERATIONAL CONTACTS
    // ========================================================================

    /**
     * Personnel/reference visibility intentionally uses reference visibility
     * because lower-level assignments may need their parent operational
     * contacts.
     *
     * Safe-contact DTO projection must still be enforced by the personnel
     * service.
     */
    public boolean canViewOperationalContact(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {

        return rolePolicy.canViewOperationalContacts()
                && canViewScopedReference(
                electionId,
                countyId,
                districtId,
                centerId,
                placeId
        );
    }

    // ========================================================================
    // NOTIFICATIONS
    // ========================================================================

    public boolean canViewOwnNotification(
            UUID notificationUserId
    ) {

        return notificationUserId != null
                && accessPolicy.currentUserId() != null
                && Objects.equals(
                notificationUserId,
                accessPolicy.currentUserId()
        );
    }

    // ========================================================================
    // REPORTS
    // ========================================================================

    /**
     * ReportSnapshot access follows the actual report geography.
     *
     * A lower-level user does not inherit a parent-level report merely because
     * that parent geography is visible for navigation.
     */
    public boolean canViewReportSnapshot(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {

        return rolePolicy.canViewScopedReports()
                && canAccessOperationalLocation(
                electionId,
                countyId,
                districtId,
                centerId,
                placeId
        );
    }

    /**
     * ReportFile inherits authorization from ReportSnapshot.
     */
    public boolean canViewReportFile(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {

        return canViewReportSnapshot(
                electionId,
                countyId,
                districtId,
                centerId,
                placeId
        );
    }

    /**
     * Operational report creation:
     *
     * COUNTY:
     *     own county
     *     + district
     *     + center
     *     + place descendants
     *
     * DISTRICT:
     *     own district
     *     + center
     *     + place descendants
     *
     * CENTER:
     *     own center
     *     + place descendants
     *
     * PLACE:
     *     no report-generation action
     *
     * MULTI_COUNTY:
     *     no report-generation action
     *
     * ORGANIZATION:
     *     no regular operational report-generation action
     *
     * Administrative roles preserve their existing administrative behavior.
     */
    public boolean canGenerateReport(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {

        if (!rolePolicy.canGenerateScopedReports()) {
            return false;
        }

        if (electionId == null) {
            return false;
        }

        // --------------------------------------------------------------------
        // ADMINISTRATIVE USERS
        // --------------------------------------------------------------------

        if (rolePolicy.isAdministrativeRole()) {

            return canAccessOperationalLocation(
                    electionId,
                    countyId,
                    districtId,
                    centerId,
                    placeId
            );
        }

        // --------------------------------------------------------------------
        // OPERATIONAL USERS
        // --------------------------------------------------------------------

        if (!rolePolicy.isOperationalRole()) {
            return false;
        }

        AssignmentScope scope =
                accessPolicy.currentScope(
                        electionId
                );

        if (scope == null) {
            return false;
        }

        return switch (scope) {

            /*
             * COUNTY may generate at its own level or any descendant.
             *
             * countyId is therefore the minimum required geography.
             */
            case COUNTY ->
                    countyId != null
                            && canAccessOperationalLocation(
                            electionId,
                            countyId,
                            districtId,
                            centerId,
                            placeId
                    );

            /*
             * DISTRICT may not generate a parent COUNTY-only report.
             */
            case DISTRICT ->
                    districtId != null
                            && canAccessOperationalLocation(
                            electionId,
                            countyId,
                            districtId,
                            centerId,
                            placeId
                    );

            /*
             * CENTER may not generate COUNTY or DISTRICT-level reports.
             */
            case CENTER ->
                    centerId != null
                            && canAccessOperationalLocation(
                            electionId,
                            countyId,
                            districtId,
                            centerId,
                            placeId
                    );

            /*
             * Final approved Operations design does not grant report
             * generation to these operational scopes.
             */
            case ORGANIZATION,
                 MULTI_COUNTY,
                 PLACE -> false;
        };
    }

    // ========================================================================
    // RESULT VIEWS
    // ========================================================================

    /**
     * Generic result visibility.
     *
     * Concrete aggregate result services must still prove that the complete
     * aggregate universe is inside the assignment before exposing it.
     */
    public boolean canViewResult(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {

        return rolePolicy.canViewOperationalReferenceData()
                && canViewScopedReference(
                electionId,
                countyId,
                districtId,
                centerId,
                placeId
        );
    }

    // ========================================================================
    // REQUIRE
    // ========================================================================

    public void require(
            boolean allowed,
            String message
    ) {

        if (!allowed) {

            throw new AccessDeniedException(
                    message
            );
        }
    }

    // ========================================================================
    // ACTUAL RESOURCE LOCATION
    // ========================================================================

    /**
     * Actual downward reach.
     *
     * Unlike canViewScopedReference(), this method does NOT grant access to a
     * parent resource merely because that parent is useful reference data.
     */
    private boolean canAccessOperationalLocation(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {

        if (
                electionId == null
                        || !accessPolicy.hasOperationalAccess(electionId)
        ) {
            return false;
        }

        /*
         * Use the deepest concrete location supplied.
         */
        if (placeId != null) {

            return accessPolicy.canAccessPlace(
                    electionId,
                    countyId,
                    districtId,
                    centerId,
                    placeId
            );
        }

        if (centerId != null) {

            return accessPolicy.canAccessCenter(
                    electionId,
                    countyId,
                    districtId,
                    centerId
            );
        }

        if (districtId != null) {

            return accessPolicy.canAccessDistrict(
                    electionId,
                    countyId,
                    districtId
            );
        }

        if (countyId != null) {

            return accessPolicy.canAccessCounty(
                    electionId,
                    countyId
            );
        }

        /*
         * Election-wide operational resource.
         *
         * Only effective ORGANIZATION reach covers the whole election.
         */
        return accessPolicy.currentScope(electionId)
                == AssignmentScope.ORGANIZATION;
    }

    // ========================================================================
    // READ-ONLY REFERENCE VISIBILITY
    // ========================================================================

    /**
     * Reference visibility intentionally permits required parent geography.
     *
     * Use this only for read-only reference/navigation resources.
     */
    private boolean canViewScopedReference(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {

        if (electionId == null) {
            return false;
        }

        if (placeId != null) {

            return accessPolicy.canViewPlaceReference(
                    electionId,
                    countyId,
                    districtId,
                    centerId,
                    placeId
            );
        }

        if (centerId != null) {

            return accessPolicy.canViewCenterReference(
                    electionId,
                    countyId,
                    districtId,
                    centerId
            );
        }

        if (districtId != null) {

            return accessPolicy.canViewDistrictReference(
                    electionId,
                    countyId,
                    districtId
            );
        }

        if (countyId != null) {

            return accessPolicy.canViewCountyReference(
                    electionId,
                    countyId
            );
        }

        return accessPolicy.hasOperationalAccess(
                electionId
        );
    }
}





//package election.ems_backend.policy;
//
//import election.ems_backend.entity.VoteSubmission;
//
//import lombok.RequiredArgsConstructor;
//
//import org.springframework.security.access.AccessDeniedException;
//import org.springframework.stereotype.Component;
//
//import java.util.Objects;
//import java.util.UUID;
//
///**
// * ========================================================================
// * OPERATION RESOURCE POLICY
// * ========================================================================
// *
// * Shared read/access rules for the broader Operations workspace.
// *
// * Regular operational roles receive read-only, scope-limited access to the
// * supporting election resources identified for Operations:
// *
// * - geography references
// * - operational contacts
// * - center/place allocations
// * - contests / election parties / election candidates
// * - vote submission action history
// * - tally sheets
// * - vote tallies
// * - observer reports
// * - discrepancies
// * - report snapshots/files
// * - tally/candidate/geographic result views
// * - own notifications
// *
// * Mutation-specific workflows remain in their entity-specific policy/service.
// * ========================================================================
// */
//@Component
//@RequiredArgsConstructor
//public class OperationResourcePolicy {
//
//    private final OperationRolePolicy rolePolicy;
//    private final OperationAccessPolicy accessPolicy;
//    private final OperationSubmissionAccessPolicy submissionAccessPolicy;
//
//    public boolean canViewElectionReference(UUID electionId) {
//        return rolePolicy.canViewOperationalReferenceData()
//                && accessPolicy.hasOperationalAccess(electionId);
//    }
//
//    public boolean canViewCounty(
//            UUID electionId,
//            UUID countyId
//    ) {
//        return rolePolicy.canViewGeography()
//                && accessPolicy.canViewCountyReference(electionId, countyId);
//    }
//
//    public boolean canViewDistrict(
//            UUID electionId,
//            UUID countyId,
//            UUID districtId
//    ) {
//        return rolePolicy.canViewGeography()
//                && accessPolicy.canViewDistrictReference(
//                electionId,
//                countyId,
//                districtId
//        );
//    }
//
//    public boolean canViewCenter(
//            UUID electionId,
//            UUID countyId,
//            UUID districtId,
//            UUID centerId
//    ) {
//        return rolePolicy.canViewGeography()
//                && accessPolicy.canViewCenterReference(
//                electionId,
//                countyId,
//                districtId,
//                centerId
//        );
//    }
//
//    public boolean canViewPlace(
//            UUID electionId,
//            UUID countyId,
//            UUID districtId,
//            UUID centerId,
//            UUID placeId
//    ) {
//        return rolePolicy.canViewGeography()
//                && accessPolicy.canViewPlaceReference(
//                electionId,
//                countyId,
//                districtId,
//                centerId,
//                placeId
//        );
//    }
//
//    public boolean canViewAllocation(
//            UUID electionId,
//            UUID countyId,
//            UUID districtId,
//            UUID centerId,
//            UUID placeId
//    ) {
//        return rolePolicy.canViewAllocations()
//                && canViewScopedReference(
//                electionId,
//                countyId,
//                districtId,
//                centerId,
//                placeId
//        );
//    }
//
//    public boolean canViewContest(
//            UUID electionId,
//            UUID countyId,
//            UUID districtId
//    ) {
//        if (!rolePolicy.canViewOperationalReferenceData()) {
//            return false;
//        }
//
//        /* NATIONAL contest/reference. */
//        if (countyId == null && districtId == null) {
//            return accessPolicy.hasOperationalAccess(electionId);
//        }
//
//        if (districtId != null) {
//            return accessPolicy.canViewDistrictReference(
//                    electionId,
//                    countyId,
//                    districtId
//            );
//        }
//
//        return accessPolicy.canViewCountyReference(electionId, countyId);
//    }
//
//    public boolean canViewElectionParty(UUID electionId) {
//        return canViewElectionReference(electionId);
//    }
//
//    public boolean canViewElectionCandidate(UUID electionId) {
//        return canViewElectionReference(electionId);
//    }
//
//    public boolean canViewVoteSubmissionAction(VoteSubmission submission) {
//        return rolePolicy.canViewSubmissionHistory()
//                && submissionAccessPolicy.canAccess(submission);
//    }
//
//    public boolean canViewTallySheet(VoteSubmission submission) {
//        return rolePolicy.canViewTallySheets()
//                && submissionAccessPolicy.canAccess(submission);
//    }
//
//    public boolean canViewVoteTally(
//            UUID electionId,
//            UUID countyId,
//            UUID districtId,
//            UUID centerId,
//            UUID placeId
//    ) {
//        return rolePolicy.canViewVoteTallies()
//                && canViewScopedReference(
//                electionId,
//                countyId,
//                districtId,
//                centerId,
//                placeId
//        );
//    }
//
//    /**
//     * ObserverReport is election-scoped.
//     *
//     * Callers should pass the electionId stored on the report itself. Geography
//     * remains subject to the authenticated user's election assignment scope.
//     */
//    public boolean canViewObserverReport(
//            UUID electionId,
//            UUID countyId,
//            UUID districtId,
//            UUID centerId,
//            UUID placeId
//    ) {
//        return rolePolicy.canViewObserverReports()
//                && canViewScopedReference(
//                electionId,
//                countyId,
//                districtId,
//                centerId,
//                placeId
//        );
//    }
//
//    public boolean canCreateObserverReport(
//            UUID electionId,
//            UUID countyId,
//            UUID districtId,
//            UUID centerId,
//            UUID placeId
//    ) {
//        return rolePolicy.canCreateObserverReport()
//                && canViewScopedReference(
//                electionId,
//                countyId,
//                districtId,
//                centerId,
//                placeId
//        );
//    }
//
//    public boolean canViewDiscrepancy(
//            UUID electionId,
//            UUID countyId,
//            UUID districtId,
//            UUID centerId,
//            UUID placeId
//    ) {
//        return rolePolicy.canViewDiscrepancies()
//                && canViewScopedReference(
//                electionId,
//                countyId,
//                districtId,
//                centerId,
//                placeId
//        );
//    }
//
//    public boolean canManageDiscrepancy(
//            UUID electionId,
//            UUID countyId,
//            UUID districtId,
//            UUID centerId,
//            UUID placeId
//    ) {
//        return rolePolicy.canManageDiscrepancies()
//                && canViewScopedReference(
//                electionId,
//                countyId,
//                districtId,
//                centerId,
//                placeId
//        );
//    }
//
//    public boolean canViewOperationalContact(
//            UUID electionId,
//            UUID countyId,
//            UUID districtId,
//            UUID centerId,
//            UUID placeId
//    ) {
//        return rolePolicy.canViewOperationalContacts()
//                && canViewScopedReference(
//                electionId,
//                countyId,
//                districtId,
//                centerId,
//                placeId
//        );
//    }
//
//    public boolean canViewOwnNotification(UUID notificationUserId) {
//        return notificationUserId != null
//                && accessPolicy.currentUserId() != null
//                && Objects.equals(notificationUserId, accessPolicy.currentUserId());
//    }
//
//    public boolean canViewReportSnapshot(
//            UUID electionId,
//            UUID countyId,
//            UUID districtId,
//            UUID centerId,
//            UUID placeId
//    ) {
//        return rolePolicy.canViewScopedReports()
//                && canViewScopedReference(
//                electionId,
//                countyId,
//                districtId,
//                centerId,
//                placeId
//        );
//    }
//
//    /** ReportFile inherits access from its ReportSnapshot. */
//    public boolean canViewReportFile(
//            UUID electionId,
//            UUID countyId,
//            UUID districtId,
//            UUID centerId,
//            UUID placeId
//    ) {
//        return canViewReportSnapshot(
//                electionId,
//                countyId,
//                districtId,
//                centerId,
//                placeId
//        );
//    }
//
//    public boolean canGenerateReport(
//            UUID electionId,
//            UUID countyId,
//            UUID districtId,
//            UUID centerId,
//            UUID placeId
//    ) {
//        return rolePolicy.canGenerateScopedReports()
//                && canViewScopedReference(
//                electionId,
//                countyId,
//                districtId,
//                centerId,
//                placeId
//        );
//    }
//
//    public boolean canViewResult(
//            UUID electionId,
//            UUID countyId,
//            UUID districtId,
//            UUID centerId,
//            UUID placeId
//    ) {
//        return rolePolicy.canViewOperationalReferenceData()
//                && canViewScopedReference(
//                electionId,
//                countyId,
//                districtId,
//                centerId,
//                placeId
//        );
//    }
//
//    public void require(boolean allowed, String message) {
//        if (!allowed) {
//            throw new AccessDeniedException(message);
//        }
//    }
//
//    private boolean canViewScopedReference(
//            UUID electionId,
//            UUID countyId,
//            UUID districtId,
//            UUID centerId,
//            UUID placeId
//    ) {
//        if (electionId == null) {
//            return false;
//        }
//
//        if (placeId != null) {
//            return accessPolicy.canViewPlaceReference(
//                    electionId,
//                    countyId,
//                    districtId,
//                    centerId,
//                    placeId
//            );
//        }
//
//        if (centerId != null) {
//            return accessPolicy.canViewCenterReference(
//                    electionId,
//                    countyId,
//                    districtId,
//                    centerId
//            );
//        }
//
//        if (districtId != null) {
//            return accessPolicy.canViewDistrictReference(
//                    electionId,
//                    countyId,
//                    districtId
//            );
//        }
//
//        if (countyId != null) {
//            return accessPolicy.canViewCountyReference(
//                    electionId,
//                    countyId
//            );
//        }
//
//        return accessPolicy.hasOperationalAccess(electionId);
//    }
//}
