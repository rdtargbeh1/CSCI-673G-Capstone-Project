package election.ems_backend.policy;

import election.ems_backend.entity.Contest;
import election.ems_backend.entity.County;
import election.ems_backend.entity.District;
import election.ems_backend.entity.ObserverReport;
import election.ems_backend.entity.PollingCenter;
import election.ems_backend.entity.PollingCenterAllocation;
import election.ems_backend.entity.PollingPlace;
import election.ems_backend.entity.PollingPlaceAllocation;
import election.ems_backend.entity.UserElectionAssignment;
import election.ems_backend.enums.AssignmentScope;

import lombok.RequiredArgsConstructor;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * ========================================================================
 * OPERATION SCOPE SPECIFICATIONS
 * ========================================================================
 *
 * Converts the authenticated operational user's UserElectionAssignment into
 * database-level row filtering for existing entity searches.
 *
 * IMPORTANT:
 *
 * - This class does NOT replace existing repositories.
 * - This class does NOT replace existing business services.
 * - This class does NOT replace existing entity visibility specifications.
 * - Administrative roles keep their existing service/query behavior.
 *
 * The specification returned here is intended to be AND-ed with the existing
 * entity specification only when the current user is an operational role.
 *
 * Example:
 *
 *     Specification<ObserverReport> spec =
 *             ObserverReportSpecs.visibleToTenant(orgId);
 *
 *     if (rolePolicy.isOperationalRole()) {
 *         spec = spec.and(
 *                 scopeSpecifications.observerReports(electionId)
 *         );
 *     }
 *
 * Role determines WHAT.
 * UserElectionAssignment determines WHERE.
 * ========================================================================
 */
@Component
@RequiredArgsConstructor
public class OperationScopeSpecifications {

    private final OperationRolePolicy rolePolicy;
    private final OperationAccessPolicy accessPolicy;

    // ========================================================================
    // OBSERVER REPORTS
    // ========================================================================

    /**
     * Restricts ObserverReport rows to the current operational user's:
     *
     * - organization
     * - election
     * - active UserElectionAssignment scope
     *
     * Administrative roles are deliberately not restricted here because their
     * existing SYSTEM / NEC / TENANT query behavior must remain unchanged.
     */
    public Specification<ObserverReport> observerReports(
            UUID electionId
    ) {

        return (root, query, cb) -> {

            // ----------------------------------------------------------------
            // ADMINISTRATIVE USERS
            //
            // Preserve existing service/query behavior.
            // ----------------------------------------------------------------

            if (rolePolicy.isAdministrativeRole()) {
                return cb.conjunction();
            }

            // ----------------------------------------------------------------
            // ONLY OPERATIONAL ROLES USE ASSIGNMENT-BASED ROW FILTERING
            // ----------------------------------------------------------------

            if (!rolePolicy.isOperationalRole()) {
                return cb.disjunction();
            }

            UUID userId =
                    accessPolicy.currentUserId();

            UUID orgId =
                    accessPolicy.currentOrgId();

            if (
                    userId == null
                            ||
                            orgId == null
                            ||
                            electionId == null
            ) {
                return cb.disjunction();
            }

            List<UserElectionAssignment> assignments =
                    accessPolicy.currentAssignments(
                            electionId
                    );

            if (assignments.isEmpty()) {
                return cb.disjunction();
            }

            AssignmentScope scope =
                    accessPolicy.currentScope(
                            electionId
                    );

            if (scope == null) {
                return cb.disjunction();
            }

            /*
             * Every operational query remains inside the authenticated
             * organization and selected election.
             */
            var base =
                    cb.and(
                            cb.equal(
                                    root.get("organization").get("orgId"),
                                    orgId
                            ),
                            cb.equal(
                                    root.get("election").get("electionId"),
                                    electionId
                            )
                    );

            // ----------------------------------------------------------------
            // ORGANIZATION
            // ----------------------------------------------------------------

            if (scope == AssignmentScope.ORGANIZATION) {
                return base;
            }

            // ----------------------------------------------------------------
            // MULTI_COUNTY / COUNTY
            // ----------------------------------------------------------------

            if (
                    scope == AssignmentScope.MULTI_COUNTY
                            ||
                            scope == AssignmentScope.COUNTY
            ) {

                Set<UUID> countyIds =
                        accessPolicy.assignedCountyIds(
                                electionId
                        );

                if (countyIds.isEmpty()) {
                    return cb.disjunction();
                }

                return cb.and(
                        base,
                        root.get("county")
                                .get("countyId")
                                .in(countyIds)
                );
            }

            // ----------------------------------------------------------------
            // DISTRICT
            // ----------------------------------------------------------------

            if (scope == AssignmentScope.DISTRICT) {

                Set<UUID> districtIds =
                        accessPolicy.assignedDistrictIds(
                                electionId
                        );

                if (districtIds.isEmpty()) {
                    return cb.disjunction();
                }

                return cb.and(
                        base,
                        root.get("district")
                                .get("districtId")
                                .in(districtIds)
                );
            }

            // ----------------------------------------------------------------
            // CENTER
            // ----------------------------------------------------------------

            if (scope == AssignmentScope.CENTER) {

                Set<UUID> centerIds =
                        accessPolicy.assignedCenterIds(
                                electionId
                        );

                if (centerIds.isEmpty()) {
                    return cb.disjunction();
                }

                return cb.and(
                        base,
                        root.get("pollingCenter")
                                .get("centerId")
                                .in(centerIds)
                );
            }

            // ----------------------------------------------------------------
            // PLACE
            //
            // ObserverReport currently does not store place_id.
            //
            // A PLACE-assigned user is therefore limited to:
            //
            // 1. the polling center containing the assigned place, AND
            // 2. reports created by that authenticated user.
            //
            // This prevents one PLACE user from seeing every observer report
            // created by other users at the same center.
            // ----------------------------------------------------------------

            if (scope == AssignmentScope.PLACE) {

                Set<UUID> centerIds =
                        assignments
                                .stream()
                                .filter(Objects::nonNull)
                                .filter(a ->
                                        a.getPlace() != null
                                                &&
                                                a.getPlace().getPollingCenter() != null
                                )
                                .map(a ->
                                        a.getPlace()
                                                .getPollingCenter()
                                                .getCenterId()
                                )
                                .filter(Objects::nonNull)
                                .collect(Collectors.toSet());

                if (centerIds.isEmpty()) {
                    return cb.disjunction();
                }

                return cb.and(
                        base,
                        root.get("pollingCenter")
                                .get("centerId")
                                .in(centerIds),
                        cb.equal(
                                root.get("observer").get("userId"),
                                userId
                        )
                );
            }

            return cb.disjunction();
        };
    }

    // ========================================================================
    // GEOGRAPHY REFERENCE DATA
    // ========================================================================

    /**
     * Counties visible as operational reference data.
     * Lower-level assignments retain visibility of their parent county.
     */
    public Specification<County> counties(UUID electionId) {
        return (root, query, cb) -> {
            if (rolePolicy.isAdministrativeRole()) {
                return cb.conjunction();
            }

            if (!rolePolicy.isOperationalRole() || electionId == null) {
                return cb.disjunction();
            }

            List<UserElectionAssignment> assignments = accessPolicy.currentAssignments(electionId);
            AssignmentScope scope = accessPolicy.currentScope(electionId);

            if (assignments.isEmpty() || scope == null) {
                return cb.disjunction();
            }

            if (scope == AssignmentScope.ORGANIZATION) {
                return cb.conjunction();
            }

            Set<UUID> countyIds = referenceCountyIds(assignments);
            if (countyIds.isEmpty()) {
                return cb.disjunction();
            }

            return root.get("countyId").in(countyIds);
        };
    }

    /**
     * Districts visible as operational reference data.
     * County assignments see descendants; lower-level assignments retain the
     * parent district needed to navigate their assigned area.
     */
    public Specification<District> districts(UUID electionId) {
        return (root, query, cb) -> {
            if (rolePolicy.isAdministrativeRole()) {
                return cb.conjunction();
            }

            if (!rolePolicy.isOperationalRole() || electionId == null) {
                return cb.disjunction();
            }

            List<UserElectionAssignment> assignments = accessPolicy.currentAssignments(electionId);
            AssignmentScope scope = accessPolicy.currentScope(electionId);

            if (assignments.isEmpty() || scope == null) {
                return cb.disjunction();
            }

            if (scope == AssignmentScope.ORGANIZATION) {
                return cb.conjunction();
            }

            if (scope == AssignmentScope.MULTI_COUNTY || scope == AssignmentScope.COUNTY) {
                Set<UUID> countyIds = referenceCountyIds(assignments);
                if (countyIds.isEmpty()) {
                    return cb.disjunction();
                }
                return root.get("county").get("countyId").in(countyIds);
            }

            Set<UUID> districtIds = referenceDistrictIds(assignments);
            if (districtIds.isEmpty()) {
                return cb.disjunction();
            }

            return root.get("districtId").in(districtIds);
        };
    }

    /**
     * Polling centers visible as operational reference data.
     */
    public Specification<PollingCenter> pollingCenters(UUID electionId) {
        return (root, query, cb) -> {
            if (rolePolicy.isAdministrativeRole()) {
                return cb.conjunction();
            }

            if (!rolePolicy.isOperationalRole() || electionId == null) {
                return cb.disjunction();
            }

            List<UserElectionAssignment> assignments = accessPolicy.currentAssignments(electionId);
            AssignmentScope scope = accessPolicy.currentScope(electionId);

            if (assignments.isEmpty() || scope == null) {
                return cb.disjunction();
            }

            if (scope == AssignmentScope.ORGANIZATION) {
                return cb.conjunction();
            }

            if (scope == AssignmentScope.MULTI_COUNTY || scope == AssignmentScope.COUNTY) {
                Set<UUID> countyIds = referenceCountyIds(assignments);
                if (countyIds.isEmpty()) {
                    return cb.disjunction();
                }
                return root.get("district").get("county").get("countyId").in(countyIds);
            }

            if (scope == AssignmentScope.DISTRICT) {
                Set<UUID> districtIds = referenceDistrictIds(assignments);
                if (districtIds.isEmpty()) {
                    return cb.disjunction();
                }
                return root.get("district").get("districtId").in(districtIds);
            }

            Set<UUID> centerIds = referenceCenterIds(assignments);
            if (centerIds.isEmpty()) {
                return cb.disjunction();
            }

            return root.get("centerId").in(centerIds);
        };
    }

    /**
     * Polling places visible as operational reference data.
     */
    public Specification<PollingPlace> pollingPlaces(UUID electionId) {
        return (root, query, cb) -> {
            if (rolePolicy.isAdministrativeRole()) {
                return cb.conjunction();
            }

            if (!rolePolicy.isOperationalRole() || electionId == null) {
                return cb.disjunction();
            }

            List<UserElectionAssignment> assignments = accessPolicy.currentAssignments(electionId);
            AssignmentScope scope = accessPolicy.currentScope(electionId);

            if (assignments.isEmpty() || scope == null) {
                return cb.disjunction();
            }

            if (scope == AssignmentScope.ORGANIZATION) {
                return cb.conjunction();
            }

            if (scope == AssignmentScope.MULTI_COUNTY || scope == AssignmentScope.COUNTY) {
                Set<UUID> countyIds = referenceCountyIds(assignments);
                if (countyIds.isEmpty()) {
                    return cb.disjunction();
                }
                return root.get("pollingCenter")
                        .get("district")
                        .get("county")
                        .get("countyId")
                        .in(countyIds);
            }

            if (scope == AssignmentScope.DISTRICT) {
                Set<UUID> districtIds = referenceDistrictIds(assignments);
                if (districtIds.isEmpty()) {
                    return cb.disjunction();
                }
                return root.get("pollingCenter")
                        .get("district")
                        .get("districtId")
                        .in(districtIds);
            }

            if (scope == AssignmentScope.CENTER) {
                Set<UUID> centerIds = referenceCenterIds(assignments);
                if (centerIds.isEmpty()) {
                    return cb.disjunction();
                }
                return root.get("pollingCenter")
                        .get("centerId")
                        .in(centerIds);
            }

            Set<UUID> placeIds = referencePlaceIds(assignments);
            if (placeIds.isEmpty()) {
                return cb.disjunction();
            }

            return root.get("placeId").in(placeIds);
        };
    }



    // ========================================================================
    // CONTESTS
    // ========================================================================

    /**
     * Restricts Contest rows to election/scoped operational reference access.
     *
     * NATIONAL contests are election-wide operational reference data.
     *
     * COUNTY and DISTRICT contests are visible when their geography falls
     * inside the user's assignment or is the parent reference geography of a
     * lower-level assignment.
     */
    public Specification<Contest> contests(
            UUID electionId
    ) {
        return (root, query, cb) -> {

            if (rolePolicy.isAdministrativeRole()) {
                return cb.equal(
                        root.get("electionId"),
                        electionId
                );
            }

            if (!rolePolicy.isOperationalRole() || electionId == null) {
                return cb.disjunction();
            }

            List<UserElectionAssignment> assignments =
                    accessPolicy.currentAssignments(electionId);

            if (assignments.isEmpty()
                    || !accessPolicy.hasOperationalAccess(electionId)) {
                return cb.disjunction();
            }

            Set<UUID> countyIds =
                    referenceCountyIds(assignments);

            Set<UUID> districtIds =
                    referenceDistrictIds(assignments);

            var electionPredicate =
                    cb.equal(
                            root.get("electionId"),
                            electionId
                    );

            /*
             * Contest scope is stored using nullable countyId / districtId.
             *
             * NATIONAL:
             *   countyId == null && districtId == null
             *
             * COUNTY:
             *   countyId != null && districtId == null
             *
             * DISTRICT:
             *   districtId != null
             */
            var nationalContest =
                    cb.and(
                            cb.isNull(root.get("countyId")),
                            cb.isNull(root.get("districtId"))
                    );

            var visible =
                    nationalContest;

            if (!countyIds.isEmpty()) {
                visible =
                        cb.or(
                                visible,
                                cb.and(
                                        cb.isNotNull(root.get("countyId")),
                                        cb.isNull(root.get("districtId")),
                                        root.get("countyId").in(countyIds)
                                )
                        );
            }

            if (!districtIds.isEmpty()) {
                visible =
                        cb.or(
                                visible,
                                root.get("districtId").in(districtIds)
                        );
            }

            return cb.and(
                    electionPredicate,
                    visible
            );
        };
    }

    // ========================================================================
    // ALLOCATIONS
    // ========================================================================

    /**
     * Polling-center allocations visible to an operational user.
     *
     * Allocation visibility follows the same election/geographic assignment
     * hierarchy used by operational geography reference data.
     */
    public Specification<PollingCenterAllocation> pollingCenterAllocations(
            UUID electionId
    ) {
        return (root, query, cb) -> {
            if (rolePolicy.isAdministrativeRole()) {
                return cb.conjunction();
            }

            if (!rolePolicy.isOperationalRole() || electionId == null) {
                return cb.disjunction();
            }

            List<UserElectionAssignment> assignments =
                    accessPolicy.currentAssignments(electionId);

            AssignmentScope scope =
                    accessPolicy.currentScope(electionId);

            if (assignments.isEmpty() || scope == null) {
                return cb.disjunction();
            }

            var electionPredicate =
                    cb.equal(
                            root.get("election").get("electionId"),
                            electionId
                    );

            if (scope == AssignmentScope.ORGANIZATION) {
                return electionPredicate;
            }

            if (
                    scope == AssignmentScope.MULTI_COUNTY
                            ||
                            scope == AssignmentScope.COUNTY
            ) {
                Set<UUID> countyIds = referenceCountyIds(assignments);

                if (countyIds.isEmpty()) {
                    return cb.disjunction();
                }

                return cb.and(
                        electionPredicate,
                        root.get("pollingCenter")
                                .get("district")
                                .get("county")
                                .get("countyId")
                                .in(countyIds)
                );
            }

            if (scope == AssignmentScope.DISTRICT) {
                Set<UUID> districtIds = referenceDistrictIds(assignments);

                if (districtIds.isEmpty()) {
                    return cb.disjunction();
                }

                return cb.and(
                        electionPredicate,
                        root.get("pollingCenter")
                                .get("district")
                                .get("districtId")
                                .in(districtIds)
                );
            }

            /*
             * CENTER and PLACE scope both need the containing center allocation
             * as operational reference data. PLACE scope therefore resolves the
             * center through its assigned polling place.
             */
            Set<UUID> centerIds = referenceCenterIds(assignments);

            if (centerIds.isEmpty()) {
                return cb.disjunction();
            }

            return cb.and(
                    electionPredicate,
                    root.get("pollingCenter")
                            .get("centerId")
                            .in(centerIds)
            );
        };
    }

    /**
     * Polling-place allocations visible to an operational user.
     */
    public Specification<PollingPlaceAllocation> pollingPlaceAllocations(
            UUID electionId
    ) {
        return (root, query, cb) -> {
            if (rolePolicy.isAdministrativeRole()) {
                return cb.conjunction();
            }

            if (!rolePolicy.isOperationalRole() || electionId == null) {
                return cb.disjunction();
            }

            List<UserElectionAssignment> assignments =
                    accessPolicy.currentAssignments(electionId);

            AssignmentScope scope =
                    accessPolicy.currentScope(electionId);

            if (assignments.isEmpty() || scope == null) {
                return cb.disjunction();
            }

            var electionPredicate =
                    cb.equal(
                            root.get("election").get("electionId"),
                            electionId
                    );

            if (scope == AssignmentScope.ORGANIZATION) {
                return electionPredicate;
            }

            if (
                    scope == AssignmentScope.MULTI_COUNTY
                            ||
                            scope == AssignmentScope.COUNTY
            ) {
                Set<UUID> countyIds = referenceCountyIds(assignments);

                if (countyIds.isEmpty()) {
                    return cb.disjunction();
                }

                return cb.and(
                        electionPredicate,
                        root.get("pollingPlace")
                                .get("pollingCenter")
                                .get("district")
                                .get("county")
                                .get("countyId")
                                .in(countyIds)
                );
            }

            if (scope == AssignmentScope.DISTRICT) {
                Set<UUID> districtIds = referenceDistrictIds(assignments);

                if (districtIds.isEmpty()) {
                    return cb.disjunction();
                }

                return cb.and(
                        electionPredicate,
                        root.get("pollingPlace")
                                .get("pollingCenter")
                                .get("district")
                                .get("districtId")
                                .in(districtIds)
                );
            }

            if (scope == AssignmentScope.CENTER) {
                Set<UUID> centerIds = referenceCenterIds(assignments);

                if (centerIds.isEmpty()) {
                    return cb.disjunction();
                }

                return cb.and(
                        electionPredicate,
                        root.get("pollingPlace")
                                .get("pollingCenter")
                                .get("centerId")
                                .in(centerIds)
                );
            }

            Set<UUID> placeIds = referencePlaceIds(assignments);

            if (placeIds.isEmpty()) {
                return cb.disjunction();
            }

            return cb.and(
                    electionPredicate,
                    root.get("pollingPlace")
                            .get("placeId")
                            .in(placeIds)
            );
        };
    }

    // ========================================================================
    // GEOGRAPHY ID RESOLUTION
    // ========================================================================

    private Set<UUID> referenceCountyIds(List<UserElectionAssignment> assignments) {
        return assignments.stream()
                .filter(Objects::nonNull)
                .map(assignment -> {
                    if (assignment.getCounty() != null) {
                        return assignment.getCounty().getCountyId();
                    }
                    if (assignment.getDistrict() != null && assignment.getDistrict().getCounty() != null) {
                        return assignment.getDistrict().getCounty().getCountyId();
                    }
                    if (assignment.getCenter() != null
                            && assignment.getCenter().getDistrict() != null
                            && assignment.getCenter().getDistrict().getCounty() != null) {
                        return assignment.getCenter().getDistrict().getCounty().getCountyId();
                    }
                    if (assignment.getPlace() != null
                            && assignment.getPlace().getPollingCenter() != null
                            && assignment.getPlace().getPollingCenter().getDistrict() != null
                            && assignment.getPlace().getPollingCenter().getDistrict().getCounty() != null) {
                        return assignment.getPlace().getPollingCenter().getDistrict().getCounty().getCountyId();
                    }
                    return null;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private Set<UUID> referenceDistrictIds(List<UserElectionAssignment> assignments) {
        return assignments.stream()
                .filter(Objects::nonNull)
                .map(assignment -> {
                    if (assignment.getDistrict() != null) {
                        return assignment.getDistrict().getDistrictId();
                    }
                    if (assignment.getCenter() != null && assignment.getCenter().getDistrict() != null) {
                        return assignment.getCenter().getDistrict().getDistrictId();
                    }
                    if (assignment.getPlace() != null
                            && assignment.getPlace().getPollingCenter() != null
                            && assignment.getPlace().getPollingCenter().getDistrict() != null) {
                        return assignment.getPlace().getPollingCenter().getDistrict().getDistrictId();
                    }
                    return null;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private Set<UUID> referenceCenterIds(List<UserElectionAssignment> assignments) {
        return assignments.stream()
                .filter(Objects::nonNull)
                .map(assignment -> {
                    if (assignment.getCenter() != null) {
                        return assignment.getCenter().getCenterId();
                    }
                    if (assignment.getPlace() != null && assignment.getPlace().getPollingCenter() != null) {
                        return assignment.getPlace().getPollingCenter().getCenterId();
                    }
                    return null;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private Set<UUID> referencePlaceIds(List<UserElectionAssignment> assignments) {
        return assignments.stream()
                .filter(Objects::nonNull)
                .filter(assignment -> assignment.getPlace() != null)
                .map(assignment -> assignment.getPlace().getPlaceId())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

}
