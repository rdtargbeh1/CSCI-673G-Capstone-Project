package election.ems_backend.policy;

import election.ems_backend.entity.VoteSubmission;

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
 * Shared read/access rules for the broader Operations workspace.
 *
 * Regular operational roles receive read-only, scope-limited access to the
 * supporting election resources identified for Operations:
 *
 * - geography references
 * - operational contacts
 * - center/place allocations
 * - contests / election parties / election candidates
 * - vote submission action history
 * - tally sheets
 * - vote tallies
 * - observer reports
 * - discrepancies
 * - report snapshots/files
 * - tally/candidate/geographic result views
 * - own notifications
 *
 * Mutation-specific workflows remain in their entity-specific policy/service.
 * ========================================================================
 */
@Component
@RequiredArgsConstructor
public class OperationResourcePolicy {

    private final OperationRolePolicy rolePolicy;
    private final OperationAccessPolicy accessPolicy;
    private final OperationSubmissionAccessPolicy submissionAccessPolicy;

    public boolean canViewElectionReference(UUID electionId) {
        return rolePolicy.canViewOperationalReferenceData()
                && accessPolicy.hasOperationalAccess(electionId);
    }

    public boolean canViewCounty(
            UUID electionId,
            UUID countyId
    ) {
        return rolePolicy.canViewGeography()
                && accessPolicy.canViewCountyReference(electionId, countyId);
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

    public boolean canViewContest(
            UUID electionId,
            UUID countyId,
            UUID districtId
    ) {
        if (!rolePolicy.canViewOperationalReferenceData()) {
            return false;
        }

        /* NATIONAL contest/reference. */
        if (countyId == null && districtId == null) {
            return accessPolicy.hasOperationalAccess(electionId);
        }

        if (districtId != null) {
            return accessPolicy.canViewDistrictReference(
                    electionId,
                    countyId,
                    districtId
            );
        }

        return accessPolicy.canViewCountyReference(electionId, countyId);
    }

    public boolean canViewElectionParty(UUID electionId) {
        return canViewElectionReference(electionId);
    }

    public boolean canViewElectionCandidate(UUID electionId) {
        return canViewElectionReference(electionId);
    }

    public boolean canViewVoteSubmissionAction(VoteSubmission submission) {
        return rolePolicy.canViewSubmissionHistory()
                && submissionAccessPolicy.canAccess(submission);
    }

    public boolean canViewTallySheet(VoteSubmission submission) {
        return rolePolicy.canViewTallySheets()
                && submissionAccessPolicy.canAccess(submission);
    }

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

    /**
     * ObserverReport is election-scoped.
     *
     * Callers should pass the electionId stored on the report itself. Geography
     * remains subject to the authenticated user's election assignment scope.
     */
    public boolean canViewObserverReport(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {
        return rolePolicy.canViewObserverReports()
                && canViewScopedReference(
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
                && canViewScopedReference(
                electionId,
                countyId,
                districtId,
                centerId,
                placeId
        );
    }

    public boolean canViewDiscrepancy(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {
        return rolePolicy.canViewDiscrepancies()
                && canViewScopedReference(
                electionId,
                countyId,
                districtId,
                centerId,
                placeId
        );
    }

    public boolean canManageDiscrepancy(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {
        return rolePolicy.canManageDiscrepancies()
                && canViewScopedReference(
                electionId,
                countyId,
                districtId,
                centerId,
                placeId
        );
    }

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

    public boolean canViewOwnNotification(UUID notificationUserId) {
        return notificationUserId != null
                && accessPolicy.currentUserId() != null
                && Objects.equals(notificationUserId, accessPolicy.currentUserId());
    }

    public boolean canViewReportSnapshot(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {
        return rolePolicy.canViewScopedReports()
                && canViewScopedReference(
                electionId,
                countyId,
                districtId,
                centerId,
                placeId
        );
    }

    /** ReportFile inherits access from its ReportSnapshot. */
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

    public boolean canGenerateReport(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {
        return rolePolicy.canGenerateScopedReports()
                && canViewScopedReference(
                electionId,
                countyId,
                districtId,
                centerId,
                placeId
        );
    }

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

    public void require(boolean allowed, String message) {
        if (!allowed) {
            throw new AccessDeniedException(message);
        }
    }

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

        return accessPolicy.hasOperationalAccess(electionId);
    }
}
