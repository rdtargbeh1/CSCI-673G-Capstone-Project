package election.ems_backend.security;

import election.ems_backend.entity.PollingCenter;
import election.ems_backend.entity.VoteSubmission;
import election.ems_backend.enums.AssignmentScope;
import election.ems_backend.tenant.TenantContext;

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
 * Submission-level geographic access policy for Election Operations.
 *
 * OperationAccessPolicy determines WHERE a user is assigned.
 *
 * This policy determines whether a specific VoteSubmission falls within
 * that assignment.
 *
 *
 * ACCESS MODEL
 *
 * ORGANIZATION
 *     -> all submissions for the current organization/election
 *
 * MULTI_COUNTY
 *     -> all submissions within assigned counties
 *
 * COUNTY
 *     -> all submissions within assigned county
 *
 * DISTRICT
 *     -> all submissions within assigned district
 *
 * CENTER
 *     -> all submissions within assigned center(s)
 *
 * PLACE
 *     -> assigned polling place only
 *     -> submission must also belong to current user
 *
 *
 * GEOGRAPHIC HIERARCHY
 *
 * County
 *     -> District
 *          -> PollingCenter
 *               -> PollingPlace
 *
 *
 * IMPORTANT
 *
 * Role determines WHAT the user may do.
 *
 * Assignment determines WHERE the user may do it.
 *
 * Organization and election remain hard access boundaries.
 * ========================================================================
 */
@Component
@RequiredArgsConstructor
public class OperationSubmissionAccessPolicy {

    private final OperationAccessPolicy operationAccessPolicy;


    // ========================================================================
    // CAN ACCESS
    // ========================================================================

    public boolean canAccess(
            VoteSubmission submission
    ) {

        if (submission == null) {
            return false;
        }


        UUID currentUserId =
                currentUserId();

        UUID currentOrgId =
                currentOrgId();


        if (
                currentUserId == null
                        ||
                        currentOrgId == null
        ) {

            return false;
        }


        // ====================================================================
        // ORGANIZATION BOUNDARY
        // ====================================================================

        if (
                submission.getOrganization() == null
                        ||
                        submission
                                .getOrganization()
                                .getOrgId() == null
        ) {

            return false;
        }


        if (
                !Objects.equals(
                        submission
                                .getOrganization()
                                .getOrgId(),
                        currentOrgId
                )
        ) {

            return false;
        }


        // ====================================================================
        // ELECTION BOUNDARY
        // ====================================================================

        if (
                submission.getElection() == null
                        ||
                        submission
                                .getElection()
                                .getElectionId() == null
        ) {

            return false;
        }


        UUID electionId =
                submission
                        .getElection()
                        .getElectionId();


        AssignmentScope scope =
                operationAccessPolicy.currentScope(
                        electionId
                );


        if (scope == null) {
            return false;
        }


        // ====================================================================
        // ORGANIZATION
        // ====================================================================

        if (
                scope
                        == AssignmentScope.ORGANIZATION
        ) {

            return true;
        }


        // ====================================================================
        // RESOLVE SUBMISSION GEOGRAPHY
        // ====================================================================

        UUID countyId =
                resolveCountyId(
                        submission
                );

        UUID districtId =
                resolveDistrictId(
                        submission
                );

        UUID centerId =
                resolveCenterId(
                        submission
                );

        UUID placeId =
                resolvePlaceId(
                        submission
                );


        // ====================================================================
        // MULTI COUNTY
        // ====================================================================

        if (
                scope
                        == AssignmentScope.MULTI_COUNTY
        ) {

            return operationAccessPolicy
                    .canAccessCounty(
                            electionId,
                            countyId
                    );
        }


        // ====================================================================
        // COUNTY
        // ====================================================================

        if (
                scope
                        == AssignmentScope.COUNTY
        ) {

            return operationAccessPolicy
                    .canAccessCounty(
                            electionId,
                            countyId
                    );
        }


        // ====================================================================
        // DISTRICT
        // ====================================================================

        if (
                scope
                        == AssignmentScope.DISTRICT
        ) {

            return operationAccessPolicy
                    .canAccessDistrict(
                            electionId,
                            countyId,
                            districtId
                    );
        }


        // ====================================================================
        // CENTER
        // ====================================================================

        if (
                scope
                        == AssignmentScope.CENTER
        ) {

            return operationAccessPolicy
                    .canAccessCenter(
                            electionId,
                            countyId,
                            districtId,
                            centerId
                    );
        }


        // ====================================================================
        // PLACE
        // ====================================================================

        if (
                scope
                        == AssignmentScope.PLACE
        ) {

            boolean geographicAccess =
                    operationAccessPolicy
                            .canAccessPlace(
                                    electionId,
                                    countyId,
                                    districtId,
                                    centerId,
                                    placeId
                            );


            if (!geographicAccess) {
                return false;
            }


            /*
             * PLACE-level users may only access their own submission.
             *
             * Even if multiple organization users are associated with
             * the same polling place:
             *
             * Agent A cannot access Agent B's submission.
             */

            return Objects.equals(
                    resolveAgentId(
                            submission
                    ),
                    currentUserId
            );
        }


        return false;
    }


    // ========================================================================
    // REQUIRE ACCESS
    // ========================================================================

    public void requireAccess(
            VoteSubmission submission
    ) {

        if (!canAccess(submission)) {

            throw new AccessDeniedException(
                    "User does not have access to this vote submission"
            );
        }
    }


    // ========================================================================
    // OWN SUBMISSION
    // ========================================================================

    public boolean isOwnSubmission(
            VoteSubmission submission
    ) {

        if (submission == null) {
            return false;
        }


        UUID currentUserId =
                currentUserId();


        if (currentUserId == null) {
            return false;
        }


        return Objects.equals(
                resolveAgentId(
                        submission
                ),
                currentUserId
        );
    }


    // ========================================================================
    // COUNTY
    // ========================================================================

    /**
     * VoteSubmission does not store county directly.
     *
     * Resolve:
     *
     * VoteSubmission
     *     -> PollingCenter
     *          -> District
     *               -> County
     */
    private UUID resolveCountyId(
            VoteSubmission submission
    ) {

        PollingCenter center =
                submission.getPollingCenter();


        if (
                center == null
                        ||
                        center.getDistrict() == null
                        ||
                        center
                                .getDistrict()
                                .getCounty() == null
        ) {

            return null;
        }


        return center
                .getDistrict()
                .getCounty()
                .getCountyId();
    }


    // ========================================================================
    // DISTRICT
    // ========================================================================

    /**
     * VoteSubmission does not store district directly.
     *
     * Resolve:
     *
     * VoteSubmission
     *     -> PollingCenter
     *          -> District
     */
    private UUID resolveDistrictId(
            VoteSubmission submission
    ) {

        PollingCenter center =
                submission.getPollingCenter();


        if (
                center == null
                        ||
                        center.getDistrict() == null
        ) {

            return null;
        }


        return center
                .getDistrict()
                .getDistrictId();
    }


    // ========================================================================
    // CENTER
    // ========================================================================

    /**
     * VoteSubmission stores polling center directly.
     */
    private UUID resolveCenterId(
            VoteSubmission submission
    ) {

        if (
                submission.getPollingCenter() == null
                        ||
                        submission
                                .getPollingCenter()
                                .getCenterId() == null
        ) {

            return null;
        }


        return submission
                .getPollingCenter()
                .getCenterId();
    }


    // ========================================================================
    // PLACE
    // ========================================================================

    /**
     * VoteSubmission stores polling place directly.
     */
    private UUID resolvePlaceId(
            VoteSubmission submission
    ) {

        if (
                submission.getPollingPlace() == null
                        ||
                        submission
                                .getPollingPlace()
                                .getPlaceId() == null
        ) {

            return null;
        }


        return submission
                .getPollingPlace()
                .getPlaceId();
    }


    // ========================================================================
    // AGENT
    // ========================================================================

    private UUID resolveAgentId(
            VoteSubmission submission
    ) {

        if (
                submission.getAgent() == null
                        ||
                        submission
                                .getAgent()
                                .getUserId() == null
        ) {

            return null;
        }


        return submission
                .getAgent()
                .getUserId();
    }


    // ========================================================================
    // CURRENT USER
    // ========================================================================

    private UUID currentUserId() {

        TenantContext context =
                TenantContext.get();


        if (context == null) {
            return null;
        }


        return context
                .userId()
                .orElse(null);
    }


    // ========================================================================
    // CURRENT ORGANIZATION
    // ========================================================================

    private UUID currentOrgId() {

        TenantContext context =
                TenantContext.get();


        if (context == null) {
            return null;
        }


        return context
                .orgId()
                .orElse(null);
    }
}