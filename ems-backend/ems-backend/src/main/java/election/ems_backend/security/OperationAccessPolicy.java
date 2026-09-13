package election.ems_backend.security;

import election.ems_backend.entity.UserElectionAssignment;
import election.ems_backend.enums.AssignmentScope;
import election.ems_backend.repository.UserElectionAssignmentRepository;
import election.ems_backend.tenant.TenantContext;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;


/**
 * ========================================================================
 * OPERATION ACCESS POLICY
 * ========================================================================
 *
 * Central geographic access policy for Election Operations.
 *
 * Applies to operational modules such as:
 *
 * - Vote Submissions
 * - Observer Reports
 * - Notifications
 * - Tally Sheets
 *
 *
 * ACCESS MODEL
 *
 * ORGANIZATION
 *     -> entire organization for the election
 *
 * MULTI_COUNTY
 *     -> all assigned counties
 *     -> all districts, centers and places below those counties
 *
 * COUNTY
 *     -> assigned county
 *     -> all districts, centers and places below the county
 *
 * DISTRICT
 *     -> assigned district
 *     -> all centers and places below the district
 *
 * CENTER
 *     -> one or more assigned centers
 *     -> all polling places below those centers
 *
 * PLACE
 *     -> assigned polling place only
 *
 *
 * IMPORTANT:
 *
 * Role determines WHAT a user may do.
 *
 * This policy determines WHERE the user may do it.
 *
 * The user's organization and election remain hard boundaries.
 * ========================================================================
 */
@Component
@RequiredArgsConstructor
public class OperationAccessPolicy {

    private final UserElectionAssignmentRepository assignmentRepository;


    // ========================================================================
    // RESOLVE CURRENT USER ASSIGNMENTS
    // ========================================================================

    public List<UserElectionAssignment> currentAssignments(
            UUID electionId
    ) {

        UUID userId =
                currentUserId();

        UUID orgId =
                currentOrgId();


        if (
                userId == null
                        ||
                        orgId == null
                        ||
                        electionId == null
        ) {

            return List.of();
        }


        return assignmentRepository
                .findByUser_UserIdAndOrganization_OrgIdAndElection_ElectionIdAndIsActiveTrue(
                        userId,
                        orgId,
                        electionId
                );
    }


    // ========================================================================
    // RESOLVE USER ASSIGNMENTS
    // ========================================================================

    public List<UserElectionAssignment> assignmentsFor(
            UUID userId,
            UUID orgId,
            UUID electionId
    ) {

        if (
                userId == null
                        ||
                        orgId == null
                        ||
                        electionId == null
        ) {

            return List.of();
        }


        return assignmentRepository
                .findByUser_UserIdAndOrganization_OrgIdAndElection_ElectionIdAndIsActiveTrue(
                        userId,
                        orgId,
                        electionId
                );
    }


    // ========================================================================
    // ASSIGNMENT EXISTS
    // ========================================================================

    public boolean hasAssignment(
            UUID electionId
    ) {

        return !currentAssignments(
                electionId
        ).isEmpty();
    }


    // ========================================================================
    // CURRENT SCOPE
    // ========================================================================

    public AssignmentScope currentScope(
            UUID electionId
    ) {

        List<UserElectionAssignment> assignments =
                currentAssignments(
                        electionId
                );


        if (assignments.isEmpty()) {
            return null;
        }


        /*
         * Service rules enforce one scope type per:
         *
         * user + organization + election
         *
         * MULTI_COUNTY and CENTER may contain multiple rows,
         * but every row must share the same scope type.
         */
        AssignmentScope scope =
                assignments
                        .get(0)
                        .getScopeType();


        boolean mixedScope =
                assignments
                        .stream()
                        .anyMatch(
                                assignment ->
                                        assignment.getScopeType()
                                                != scope
                        );


        if (mixedScope) {

            throw new IllegalStateException(
                    "User has mixed election assignment scopes"
            );
        }


        return scope;
    }


    // ========================================================================
    // ORGANIZATION ACCESS
    // ========================================================================

    public boolean hasOrganizationScope(
            UUID electionId
    ) {

        return currentAssignments(
                electionId
        )
                .stream()
                .anyMatch(
                        assignment ->
                                assignment.getScopeType()
                                        == AssignmentScope.ORGANIZATION
                );
    }


    // ========================================================================
    // COUNTY ACCESS
    // ========================================================================

    /**
     * COUNTY inheritance:
     *
     * ORGANIZATION -> all counties
     * MULTI_COUNTY -> assigned counties
     * COUNTY       -> assigned county
     */
    public boolean canAccessCounty(
            UUID electionId,
            UUID countyId
    ) {

        if (
                electionId == null
                        ||
                        countyId == null
        ) {

            return false;
        }


        List<UserElectionAssignment> assignments =
                currentAssignments(
                        electionId
                );


        for (UserElectionAssignment assignment : assignments) {

            AssignmentScope scope =
                    assignment.getScopeType();


            if (
                    scope
                            == AssignmentScope.ORGANIZATION
            ) {

                return true;
            }


            if (
                    (
                            scope
                                    == AssignmentScope.MULTI_COUNTY
                                    ||
                                    scope
                                            == AssignmentScope.COUNTY
                    )
                            &&
                            assignment.getCounty() != null
                            &&
                            Objects.equals(
                                    assignment
                                            .getCounty()
                                            .getCountyId(),
                                    countyId
                            )
            ) {

                return true;
            }
        }


        return false;
    }


    // ========================================================================
    // DISTRICT ACCESS
    // ========================================================================

    /**
     * DISTRICT inheritance:
     *
     * ORGANIZATION -> all districts
     *
     * MULTI_COUNTY / COUNTY
     *     -> district is accessible when its county is assigned
     *
     * DISTRICT
     *     -> assigned district only
     */
    public boolean canAccessDistrict(
            UUID electionId,
            UUID countyId,
            UUID districtId
    ) {

        if (
                electionId == null
                        ||
                        districtId == null
        ) {

            return false;
        }


        List<UserElectionAssignment> assignments =
                currentAssignments(
                        electionId
                );


        for (UserElectionAssignment assignment : assignments) {

            AssignmentScope scope =
                    assignment.getScopeType();


            // ----------------------------------------------------------------
            // ORGANIZATION
            // ----------------------------------------------------------------

            if (
                    scope
                            == AssignmentScope.ORGANIZATION
            ) {

                return true;
            }


            // ----------------------------------------------------------------
            // COUNTY / MULTI COUNTY
            // ----------------------------------------------------------------

            if (
                    (
                            scope
                                    == AssignmentScope.COUNTY
                                    ||
                                    scope
                                            == AssignmentScope.MULTI_COUNTY
                    )
                            &&
                            countyId != null
                            &&
                            assignment.getCounty() != null
                            &&
                            Objects.equals(
                                    assignment
                                            .getCounty()
                                            .getCountyId(),
                                    countyId
                            )
            ) {

                return true;
            }


            // ----------------------------------------------------------------
            // DISTRICT
            // ----------------------------------------------------------------

            if (
                    scope
                            == AssignmentScope.DISTRICT
                            &&
                            assignment.getDistrict() != null
                            &&
                            Objects.equals(
                                    assignment
                                            .getDistrict()
                                            .getDistrictId(),
                                    districtId
                            )
            ) {

                return true;
            }
        }


        return false;
    }


    // ========================================================================
    // CENTER ACCESS
    // ========================================================================

    /**
     * CENTER inheritance:
     *
     * ORGANIZATION
     *     -> every center
     *
     * MULTI_COUNTY / COUNTY
     *     -> every center inside assigned county
     *
     * DISTRICT
     *     -> every center inside assigned district
     *
     * CENTER
     *     -> specifically assigned center(s)
     */
    public boolean canAccessCenter(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId
    ) {

        if (
                electionId == null
                        ||
                        centerId == null
        ) {

            return false;
        }


        List<UserElectionAssignment> assignments =
                currentAssignments(
                        electionId
                );


        for (UserElectionAssignment assignment : assignments) {

            AssignmentScope scope =
                    assignment.getScopeType();


            // ----------------------------------------------------------------
            // ORGANIZATION
            // ----------------------------------------------------------------

            if (
                    scope
                            == AssignmentScope.ORGANIZATION
            ) {

                return true;
            }


            // ----------------------------------------------------------------
            // COUNTY / MULTI COUNTY
            // ----------------------------------------------------------------

            if (
                    (
                            scope
                                    == AssignmentScope.COUNTY
                                    ||
                                    scope
                                            == AssignmentScope.MULTI_COUNTY
                    )
                            &&
                            countyId != null
                            &&
                            assignment.getCounty() != null
                            &&
                            Objects.equals(
                                    assignment
                                            .getCounty()
                                            .getCountyId(),
                                    countyId
                            )
            ) {

                return true;
            }


            // ----------------------------------------------------------------
            // DISTRICT
            // ----------------------------------------------------------------

            if (
                    scope
                            == AssignmentScope.DISTRICT
                            &&
                            districtId != null
                            &&
                            assignment.getDistrict() != null
                            &&
                            Objects.equals(
                                    assignment
                                            .getDistrict()
                                            .getDistrictId(),
                                    districtId
                            )
            ) {

                return true;
            }


            // ----------------------------------------------------------------
            // CENTER
            // ----------------------------------------------------------------

            if (
                    scope
                            == AssignmentScope.CENTER
                            &&
                            assignment.getCenter() != null
                            &&
                            Objects.equals(
                                    assignment
                                            .getCenter()
                                            .getCenterId(),
                                    centerId
                            )
            ) {

                return true;
            }
        }


        return false;
    }


    // ========================================================================
    // PLACE ACCESS
    // ========================================================================

    /**
     * PLACE inheritance:
     *
     * ORGANIZATION
     *     -> every polling place
     *
     * MULTI_COUNTY / COUNTY
     *     -> every polling place inside assigned county
     *
     * DISTRICT
     *     -> every polling place inside assigned district
     *
     * CENTER
     *     -> every polling place inside assigned center(s)
     *
     * PLACE
     *     -> assigned polling place only
     */
    public boolean canAccessPlace(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {

        if (
                electionId == null
                        ||
                        placeId == null
        ) {

            return false;
        }


        List<UserElectionAssignment> assignments =
                currentAssignments(
                        electionId
                );


        for (UserElectionAssignment assignment : assignments) {

            AssignmentScope scope =
                    assignment.getScopeType();


            // ----------------------------------------------------------------
            // ORGANIZATION
            // ----------------------------------------------------------------

            if (
                    scope
                            == AssignmentScope.ORGANIZATION
            ) {

                return true;
            }


            // ----------------------------------------------------------------
            // COUNTY / MULTI COUNTY
            // ----------------------------------------------------------------

            if (
                    (
                            scope
                                    == AssignmentScope.COUNTY
                                    ||
                                    scope
                                            == AssignmentScope.MULTI_COUNTY
                    )
                            &&
                            countyId != null
                            &&
                            assignment.getCounty() != null
                            &&
                            Objects.equals(
                                    assignment
                                            .getCounty()
                                            .getCountyId(),
                                    countyId
                            )
            ) {

                return true;
            }


            // ----------------------------------------------------------------
            // DISTRICT
            // ----------------------------------------------------------------

            if (
                    scope
                            == AssignmentScope.DISTRICT
                            &&
                            districtId != null
                            &&
                            assignment.getDistrict() != null
                            &&
                            Objects.equals(
                                    assignment
                                            .getDistrict()
                                            .getDistrictId(),
                                    districtId
                            )
            ) {

                return true;
            }


            // ----------------------------------------------------------------
            // CENTER
            // ----------------------------------------------------------------

            if (
                    scope
                            == AssignmentScope.CENTER
                            &&
                            centerId != null
                            &&
                            assignment.getCenter() != null
                            &&
                            Objects.equals(
                                    assignment
                                            .getCenter()
                                            .getCenterId(),
                                    centerId
                            )
            ) {

                return true;
            }


            // ----------------------------------------------------------------
            // PLACE
            // ----------------------------------------------------------------

            if (
                    scope
                            == AssignmentScope.PLACE
                            &&
                            assignment.getPlace() != null
                            &&
                            Objects.equals(
                                    assignment
                                            .getPlace()
                                            .getPlaceId(),
                                    placeId
                            )
            ) {

                return true;
            }
        }


        return false;
    }


    // ========================================================================
    // REQUIRE COUNTY
    // ========================================================================

    public void requireCountyAccess(
            UUID electionId,
            UUID countyId
    ) {

        if (
                !canAccessCounty(
                        electionId,
                        countyId
                )
        ) {

            throw new AccessDeniedException(
                    "User is not assigned to this county"
            );
        }
    }


    // ========================================================================
    // REQUIRE DISTRICT
    // ========================================================================

    public void requireDistrictAccess(
            UUID electionId,
            UUID countyId,
            UUID districtId
    ) {

        if (
                !canAccessDistrict(
                        electionId,
                        countyId,
                        districtId
                )
        ) {

            throw new AccessDeniedException(
                    "User is not assigned to this district"
            );
        }
    }


    // ========================================================================
    // REQUIRE CENTER
    // ========================================================================

    public void requireCenterAccess(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId
    ) {

        if (
                !canAccessCenter(
                        electionId,
                        countyId,
                        districtId,
                        centerId
                )
        ) {

            throw new AccessDeniedException(
                    "User is not assigned to this polling center"
            );
        }
    }


    // ========================================================================
    // REQUIRE PLACE
    // ========================================================================

    public void requirePlaceAccess(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {

        if (
                !canAccessPlace(
                        electionId,
                        countyId,
                        districtId,
                        centerId,
                        placeId
                )
        ) {

            throw new AccessDeniedException(
                    "User is not assigned to this polling place"
            );
        }
    }


    // ========================================================================
    // ASSIGNED COUNTIES
    // ========================================================================

    public Set<UUID> assignedCountyIds(
            UUID electionId
    ) {

        return currentAssignments(
                electionId
        )
                .stream()
                .filter(
                        assignment ->
                                assignment.getCounty() != null
                )
                .map(
                        assignment ->
                                assignment
                                        .getCounty()
                                        .getCountyId()
                )
                .filter(Objects::nonNull)
                .collect(
                        Collectors.toSet()
                );
    }


    // ========================================================================
    // ASSIGNED DISTRICTS
    // ========================================================================

    public Set<UUID> assignedDistrictIds(
            UUID electionId
    ) {

        return currentAssignments(
                electionId
        )
                .stream()
                .filter(
                        assignment ->
                                assignment.getDistrict() != null
                )
                .map(
                        assignment ->
                                assignment
                                        .getDistrict()
                                        .getDistrictId()
                )
                .filter(Objects::nonNull)
                .collect(
                        Collectors.toSet()
                );
    }


    // ========================================================================
    // ASSIGNED CENTERS
    // ========================================================================

    public Set<UUID> assignedCenterIds(
            UUID electionId
    ) {

        return currentAssignments(
                electionId
        )
                .stream()
                .filter(
                        assignment ->
                                assignment.getCenter() != null
                )
                .map(
                        assignment ->
                                assignment
                                        .getCenter()
                                        .getCenterId()
                )
                .filter(Objects::nonNull)
                .collect(
                        Collectors.toSet()
                );
    }


    // ========================================================================
    // ASSIGNED PLACES
    // ========================================================================

    public Set<UUID> assignedPlaceIds(
            UUID electionId
    ) {

        return currentAssignments(
                electionId
        )
                .stream()
                .filter(
                        assignment ->
                                assignment.getPlace() != null
                )
                .map(
                        assignment ->
                                assignment
                                        .getPlace()
                                        .getPlaceId()
                )
                .filter(Objects::nonNull)
                .collect(
                        Collectors.toSet()
                );
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