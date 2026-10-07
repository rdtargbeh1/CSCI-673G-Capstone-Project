package election.ems_backend.policy;

import election.ems_backend.entity.PollingCenter;
import election.ems_backend.entity.VoteSubmission;
import election.ems_backend.enums.AssignmentScope;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.Objects;
import java.util.UUID;

/**
 * ========================================================================
 * OPERATION SUBMISSION ACCESS POLICY
 * ========================================================================
 *
 * Determines WHICH existing vote submissions a user may access.
 *
 * Administrative roles:
 *     organization-wide inside the current organization/election context.
 *
 * Operational roles:
 *     restricted by UserElectionAssignment.
 *
 * PLACE remains own-submission-only.
 * ========================================================================
 */
@Component
@RequiredArgsConstructor
public class OperationSubmissionAccessPolicy {

    private final OperationAccessPolicy operationAccessPolicy;
    private final OperationRolePolicy rolePolicy;

    public boolean canAccess(VoteSubmission submission) {
        if (submission == null || !rolePolicy.canViewSubmission()) {
            return false;
        }

        UUID currentUserId = operationAccessPolicy.currentUserId();
        UUID currentOrgId = operationAccessPolicy.currentOrgId();

        if (currentUserId == null || currentOrgId == null) {
            return false;
        }

        if (submission.getOrganization() == null
                || submission.getOrganization().getOrgId() == null
                || !Objects.equals(submission.getOrganization().getOrgId(), currentOrgId)) {
            return false;
        }

        if (submission.getElection() == null
                || submission.getElection().getElectionId() == null) {
            return false;
        }

        UUID electionId = submission.getElection().getElectionId();

        if (!operationAccessPolicy.hasOperationalAccess(electionId)) {
            return false;
        }

        /* Administrative roles use the organization boundary above. */
        if (rolePolicy.isAdministrativeRole()) {
            return true;
        }

        AssignmentScope scope = operationAccessPolicy.currentScope(electionId);

        if (scope == null) {
            return false;
        }

        if (scope == AssignmentScope.ORGANIZATION) {
            return true;
        }

        UUID countyId = resolveCountyId(submission);
        UUID districtId = resolveDistrictId(submission);
        UUID centerId = resolveCenterId(submission);
        UUID placeId = resolvePlaceId(submission);

        return switch (scope) {
            case MULTI_COUNTY, COUNTY ->
                    operationAccessPolicy.canAccessCounty(electionId, countyId);

            case DISTRICT ->
                    operationAccessPolicy.canAccessDistrict(
                            electionId,
                            countyId,
                            districtId
                    );

            case CENTER ->
                    operationAccessPolicy.canAccessCenter(
                            electionId,
                            countyId,
                            districtId,
                            centerId
                    );

            case PLACE ->
                    operationAccessPolicy.canAccessPlace(
                            electionId,
                            countyId,
                            districtId,
                            centerId,
                            placeId
                    ) && isOwnSubmission(submission);

            case ORGANIZATION -> true;
        };
    }

    public void requireAccess(VoteSubmission submission) {
        if (!canAccess(submission)) {
            throw new AccessDeniedException(
                    "User does not have access to this vote submission"
            );
        }
    }

    public boolean isOwnSubmission(VoteSubmission submission) {
        if (submission == null || operationAccessPolicy.currentUserId() == null) {
            return false;
        }

        return Objects.equals(
                resolveAgentId(submission),
                operationAccessPolicy.currentUserId()
        );
    }

    private UUID resolveCountyId(VoteSubmission submission) {
        PollingCenter center = submission.getPollingCenter();
        if (center == null
                || center.getDistrict() == null
                || center.getDistrict().getCounty() == null) {
            return null;
        }
        return center.getDistrict().getCounty().getCountyId();
    }

    private UUID resolveDistrictId(VoteSubmission submission) {
        PollingCenter center = submission.getPollingCenter();
        if (center == null || center.getDistrict() == null) {
            return null;
        }
        return center.getDistrict().getDistrictId();
    }

    private UUID resolveCenterId(VoteSubmission submission) {
        if (submission.getPollingCenter() == null) {
            return null;
        }
        return submission.getPollingCenter().getCenterId();
    }

    private UUID resolvePlaceId(VoteSubmission submission) {
        if (submission.getPollingPlace() == null) {
            return null;
        }
        return submission.getPollingPlace().getPlaceId();
    }

    private UUID resolveAgentId(VoteSubmission submission) {
        if (submission.getAgent() == null) {
            return null;
        }
        return submission.getAgent().getUserId();
    }
}
