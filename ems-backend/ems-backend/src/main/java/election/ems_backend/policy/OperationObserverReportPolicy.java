package election.ems_backend.policy;

import election.ems_backend.entity.County;
import election.ems_backend.entity.District;
import election.ems_backend.entity.Election;
import election.ems_backend.entity.ObserverReport;
import election.ems_backend.entity.PollingCenter;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * ========================================================================
 * OPERATION OBSERVER REPORT POLICY
 * ========================================================================
 *
 * Entity-specific authorization for ObserverReport inside Operations.
 *
 * This policy does NOT implement observer-report workflow logic.
 *
 * Existing ObserverReportServiceImplementation remains responsible for:
 *
 * - create/update/delete behavior
 * - verification workflow
 * - resolution workflow
 * - visibility workflow
 * - notifications
 * - evidence/file uploads
 *
 * This policy only determines whether the authenticated user may reach
 * an observer report according to:
 *
 * - role authority
 * - organization/election context
 * - UserElectionAssignment scope
 * - report geography
 *
 * ========================================================================
 */
@Component
@RequiredArgsConstructor
public class OperationObserverReportPolicy {

    private final OperationResourcePolicy resourcePolicy;
    private final OperationRolePolicy rolePolicy;
    private final OperationAccessPolicy accessPolicy;

    // ========================================================================
    // VIEW
    // ========================================================================

    public boolean canView(
            ObserverReport report
    ) {

        ObserverReportLocation location =
                resolveLocation(report);

        if (location == null) {
            return false;
        }

        return resourcePolicy.canViewObserverReport(
                location.electionId(),
                location.countyId(),
                location.districtId(),
                location.centerId(),
                null
        );
    }

    public void requireView(
            ObserverReport report
    ) {

        if (!canView(report)) {
            throw new AccessDeniedException(
                    "User does not have access to this observer report"
            );
        }
    }

    // ========================================================================
    // CREATE
    // ========================================================================

    public boolean canCreate(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId
    ) {

        return resourcePolicy.canCreateObserverReport(
                electionId,
                countyId,
                districtId,
                centerId,
                null
        );
    }

    public void requireCreate(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId
    ) {

        if (
                !canCreate(
                        electionId,
                        countyId,
                        districtId,
                        centerId
                )
        ) {

            throw new AccessDeniedException(
                    "User is not authorized to create an observer report in this assignment scope"
            );
        }
    }

    // ========================================================================
    // REVIEW
    // ========================================================================

    /**
     * Review means supervisory access to an observer report.
     *
     * This does NOT replace verification, escalation, rejection, resolution,
     * or visibility workflow rules already implemented by
     * ObserverReportServiceImplementation.
     */
    public boolean canReview(
            ObserverReport report
    ) {

        if (!rolePolicy.canReviewObserverReports()) {
            return false;
        }

        return canView(report);
    }

    public void requireReview(
            ObserverReport report
    ) {

        if (!canReview(report)) {
            throw new AccessDeniedException(
                    "User is not authorized to review this observer report"
            );
        }
    }

    // ========================================================================
    // DELETE
    // ========================================================================

    /**
     * Delete is intentionally stricter than view/review.
     *
     * Administrative roles preserve their existing delete authority.
     *
     * Operational delete requires ALL of the following:
     *
     * - role is OBSERVER or SUPERVISOR
     * - effective assignment scope is COUNTY or MULTI_COUNTY
     * - the ObserverReport belongs to that user's authorized election/geography
     *
     * FIELD_OFFICER is never granted delete authority here.
     */
    public boolean canDelete(
            ObserverReport report
    ) {

        if (report == null) {
            return false;
        }

        /*
         * Preserve the existing administrative behavior.
         *
         * Their existing service/controller workflow remains authoritative;
         * operational assignment scope is not imposed on administrators here.
         */
        if (rolePolicy.isAdministrativeRole()) {
            return true;
        }

        if (!rolePolicy.canDeleteObserverReport()) {
            return false;
        }

        ObserverReportLocation location =
                resolveLocation(report);

        if (location == null) {
            return false;
        }

        var scope =
                accessPolicy.currentScope(
                        location.electionId()
                );

        if (
                scope != election.ems_backend.enums.AssignmentScope.COUNTY
                        &&
                        scope != election.ems_backend.enums.AssignmentScope.MULTI_COUNTY
        ) {
            return false;
        }

        /*
         * Role + required scope are not enough.
         * The report itself must still belong to the user's authorized
         * election/geographic assignment.
         */
        return canView(report);
    }

    public void requireDelete(
            ObserverReport report
    ) {

        if (!canDelete(report)) {
            throw new AccessDeniedException(
                    "User is not authorized to delete this observer report"
            );
        }
    }

    // ========================================================================
    // LOCATION
    // ========================================================================

    private ObserverReportLocation resolveLocation(
            ObserverReport report
    ) {

        if (
                report == null
                        ||
                        report.getElection() == null
                        ||
                        report.getElection().getElectionId() == null
        ) {
            return null;
        }

        Election election =
                report.getElection();

        County county =
                report.getCounty();

        District district =
                report.getDistrict();

        PollingCenter center =
                report.getPollingCenter();

        /*
         * Prefer geography already stored on ObserverReport.
         *
         * If a center exists, derive missing parent geography from the
         * existing center -> district -> county hierarchy.
         */
        if (center != null) {

            if (district == null) {
                district = center.getDistrict();
            }

            if (
                    county == null
                            &&
                            district != null
            ) {
                county = district.getCounty();
            }
        }

        if (
                county == null
                        &&
                        district != null
        ) {
            county = district.getCounty();
        }

        return new ObserverReportLocation(
                election.getElectionId(),

                county != null
                        ? county.getCountyId()
                        : null,

                district != null
                        ? district.getDistrictId()
                        : null,

                center != null
                        ? center.getCenterId()
                        : null
        );
    }

    // ========================================================================
    // INTERNAL LOCATION
    // ========================================================================

    private record ObserverReportLocation(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId
    ) {
    }
}
