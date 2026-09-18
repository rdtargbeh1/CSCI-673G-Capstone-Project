package election.ems_backend.policy;

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
 * Determines WHERE an authenticated user may operate for one election.
 *
 * Administrative roles do not require UserElectionAssignment rows. When an
 * organization context is present, they receive effective ORGANIZATION reach.
 *
 * Operational roles require active UserElectionAssignment rows.
 *
 * Scope hierarchy:
 *
 * ORGANIZATION -> all organization election data
 * MULTI_COUNTY -> assigned counties and descendants
 * COUNTY       -> assigned county and descendants
 * DISTRICT     -> assigned district and descendants
 * CENTER       -> assigned center(s) and child places
 * PLACE        -> assigned polling place
 * ========================================================================
 */
@Component
@RequiredArgsConstructor
public class OperationAccessPolicy {

    private final UserElectionAssignmentRepository assignmentRepository;
    private final OperationRolePolicy rolePolicy;

    public List<UserElectionAssignment> currentAssignments(UUID electionId) {
        UUID userId = currentUserId();
        UUID orgId = currentOrgId();

        if (userId == null || orgId == null || electionId == null) {
            return List.of();
        }

        return assignmentRepository
                .findByUser_UserIdAndOrganization_OrgIdAndElection_ElectionIdAndIsActiveTrue(
                        userId,
                        orgId,
                        electionId
                );
    }

    public List<UserElectionAssignment> assignmentsFor(
            UUID userId,
            UUID orgId,
            UUID electionId
    ) {
        if (userId == null || orgId == null || electionId == null) {
            return List.of();
        }

        return assignmentRepository
                .findByUser_UserIdAndOrganization_OrgIdAndElection_ElectionIdAndIsActiveTrue(
                        userId,
                        orgId,
                        electionId
                );
    }

    /**
     * Effective Operations access. Administrative roles use organization reach;
     * operational roles require a stored assignment.
     */
    public boolean hasOperationalAccess(UUID electionId) {
        if (electionId == null || currentUserId() == null || currentOrgId() == null) {
            return false;
        }

        if (rolePolicy.isAdministrativeRole()) {
            return true;
        }

        return rolePolicy.isOperationalRole()
                && !currentAssignments(electionId).isEmpty();
    }

    /** Actual stored assignment, excluding the administrative synthetic scope. */
    public boolean hasStoredAssignment(UUID electionId) {
        return !currentAssignments(electionId).isEmpty();
    }

    /**
     * Effective scope used by downstream operation policies.
     * Administrators are organization-wide inside the active organization.
     */
    public AssignmentScope currentScope(UUID electionId) {
        if (electionId == null || currentUserId() == null || currentOrgId() == null) {
            return null;
        }

        if (rolePolicy.isAdministrativeRole()) {
            return AssignmentScope.ORGANIZATION;
        }

        if (!rolePolicy.isOperationalRole()) {
            return null;
        }

        List<UserElectionAssignment> assignments = currentAssignments(electionId);

        if (assignments.isEmpty()) {
            return null;
        }

        AssignmentScope scope = assignments.get(0).getScopeType();

        boolean mixedScope = assignments.stream()
                .anyMatch(assignment -> assignment.getScopeType() != scope);

        if (mixedScope) {
            throw new IllegalStateException(
                    "User has mixed election assignment scopes"
            );
        }

        return scope;
    }

    public boolean hasOrganizationScope(UUID electionId) {
        return currentScope(electionId) == AssignmentScope.ORGANIZATION;
    }

    // ========================================================================
    // DESCENDANT ACCESS
    // ========================================================================

    public boolean canAccessCounty(UUID electionId, UUID countyId) {
        if (electionId == null || countyId == null || !hasOperationalAccess(electionId)) {
            return false;
        }

        if (rolePolicy.isAdministrativeRole()) {
            return true;
        }

        for (UserElectionAssignment assignment : currentAssignments(electionId)) {
            AssignmentScope scope = assignment.getScopeType();

            if (scope == AssignmentScope.ORGANIZATION) {
                return true;
            }

            if ((scope == AssignmentScope.MULTI_COUNTY || scope == AssignmentScope.COUNTY)
                    && assignment.getCounty() != null
                    && Objects.equals(assignment.getCounty().getCountyId(), countyId)) {
                return true;
            }
        }

        return false;
    }

    public boolean canAccessDistrict(
            UUID electionId,
            UUID countyId,
            UUID districtId
    ) {
        if (electionId == null || districtId == null || !hasOperationalAccess(electionId)) {
            return false;
        }

        if (rolePolicy.isAdministrativeRole()) {
            return true;
        }

        for (UserElectionAssignment assignment : currentAssignments(electionId)) {
            AssignmentScope scope = assignment.getScopeType();

            if (scope == AssignmentScope.ORGANIZATION) {
                return true;
            }

            if ((scope == AssignmentScope.COUNTY || scope == AssignmentScope.MULTI_COUNTY)
                    && countyId != null
                    && assignment.getCounty() != null
                    && Objects.equals(assignment.getCounty().getCountyId(), countyId)) {
                return true;
            }

            if (scope == AssignmentScope.DISTRICT
                    && assignment.getDistrict() != null
                    && Objects.equals(assignment.getDistrict().getDistrictId(), districtId)) {
                return true;
            }
        }

        return false;
    }

    public boolean canAccessCenter(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId
    ) {
        if (electionId == null || centerId == null || !hasOperationalAccess(electionId)) {
            return false;
        }

        if (rolePolicy.isAdministrativeRole()) {
            return true;
        }

        for (UserElectionAssignment assignment : currentAssignments(electionId)) {
            AssignmentScope scope = assignment.getScopeType();

            if (scope == AssignmentScope.ORGANIZATION) {
                return true;
            }

            if ((scope == AssignmentScope.COUNTY || scope == AssignmentScope.MULTI_COUNTY)
                    && countyId != null
                    && assignment.getCounty() != null
                    && Objects.equals(assignment.getCounty().getCountyId(), countyId)) {
                return true;
            }

            if (scope == AssignmentScope.DISTRICT
                    && districtId != null
                    && assignment.getDistrict() != null
                    && Objects.equals(assignment.getDistrict().getDistrictId(), districtId)) {
                return true;
            }

            if (scope == AssignmentScope.CENTER
                    && assignment.getCenter() != null
                    && Objects.equals(assignment.getCenter().getCenterId(), centerId)) {
                return true;
            }
        }

        return false;
    }

    public boolean canAccessPlace(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {
        if (electionId == null || placeId == null || !hasOperationalAccess(electionId)) {
            return false;
        }

        if (rolePolicy.isAdministrativeRole()) {
            return true;
        }

        for (UserElectionAssignment assignment : currentAssignments(electionId)) {
            AssignmentScope scope = assignment.getScopeType();

            if (scope == AssignmentScope.ORGANIZATION) {
                return true;
            }

            if ((scope == AssignmentScope.COUNTY || scope == AssignmentScope.MULTI_COUNTY)
                    && countyId != null
                    && assignment.getCounty() != null
                    && Objects.equals(assignment.getCounty().getCountyId(), countyId)) {
                return true;
            }

            if (scope == AssignmentScope.DISTRICT
                    && districtId != null
                    && assignment.getDistrict() != null
                    && Objects.equals(assignment.getDistrict().getDistrictId(), districtId)) {
                return true;
            }

            if (scope == AssignmentScope.CENTER
                    && centerId != null
                    && assignment.getCenter() != null
                    && Objects.equals(assignment.getCenter().getCenterId(), centerId)) {
                return true;
            }

            if (scope == AssignmentScope.PLACE
                    && assignment.getPlace() != null
                    && Objects.equals(assignment.getPlace().getPlaceId(), placeId)) {
                return true;
            }
        }

        return false;
    }

    // ========================================================================
    // READ-ONLY REFERENCE VISIBILITY
    //
    // Lower-level assignments may see the parent geography needed to understand
    // and navigate their own operational area.
    // ========================================================================

    public boolean canViewCountyReference(UUID electionId, UUID countyId) {
        if (electionId == null || countyId == null || !hasOperationalAccess(electionId)) {
            return false;
        }

        if (rolePolicy.isAdministrativeRole()) {
            return true;
        }

        for (UserElectionAssignment assignment : currentAssignments(electionId)) {
            if (assignment.getScopeType() == AssignmentScope.ORGANIZATION) {
                return true;
            }

            if (assignment.getCounty() != null
                    && Objects.equals(assignment.getCounty().getCountyId(), countyId)) {
                return true;
            }
        }

        return false;
    }

    public boolean canViewDistrictReference(
            UUID electionId,
            UUID countyId,
            UUID districtId
    ) {
        if (electionId == null || districtId == null || !hasOperationalAccess(electionId)) {
            return false;
        }

        if (rolePolicy.isAdministrativeRole()) {
            return true;
        }

        for (UserElectionAssignment assignment : currentAssignments(electionId)) {
            AssignmentScope scope = assignment.getScopeType();

            if (scope == AssignmentScope.ORGANIZATION) {
                return true;
            }

            if ((scope == AssignmentScope.COUNTY || scope == AssignmentScope.MULTI_COUNTY)
                    && countyId != null
                    && assignment.getCounty() != null
                    && Objects.equals(assignment.getCounty().getCountyId(), countyId)) {
                return true;
            }

            if (assignment.getDistrict() != null
                    && Objects.equals(assignment.getDistrict().getDistrictId(), districtId)) {
                return true;
            }
        }

        return false;
    }

    public boolean canViewCenterReference(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId
    ) {
        if (electionId == null || centerId == null || !hasOperationalAccess(electionId)) {
            return false;
        }

        if (rolePolicy.isAdministrativeRole()) {
            return true;
        }

        for (UserElectionAssignment assignment : currentAssignments(electionId)) {
            AssignmentScope scope = assignment.getScopeType();

            if (scope == AssignmentScope.ORGANIZATION) {
                return true;
            }

            if ((scope == AssignmentScope.COUNTY || scope == AssignmentScope.MULTI_COUNTY)
                    && countyId != null
                    && assignment.getCounty() != null
                    && Objects.equals(assignment.getCounty().getCountyId(), countyId)) {
                return true;
            }

            if (scope == AssignmentScope.DISTRICT
                    && districtId != null
                    && assignment.getDistrict() != null
                    && Objects.equals(assignment.getDistrict().getDistrictId(), districtId)) {
                return true;
            }

            if (assignment.getCenter() != null
                    && Objects.equals(assignment.getCenter().getCenterId(), centerId)) {
                return true;
            }
        }

        return false;
    }

    public boolean canViewPlaceReference(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {
        return canAccessPlace(
                electionId,
                countyId,
                districtId,
                centerId,
                placeId
        );
    }

    // ========================================================================
    // REQUIRE HELPERS
    // ========================================================================

    public void requireCountyAccess(UUID electionId, UUID countyId) {
        if (!canAccessCounty(electionId, countyId)) {
            throw new AccessDeniedException("User is not assigned to this county");
        }
    }

    public void requireDistrictAccess(UUID electionId, UUID countyId, UUID districtId) {
        if (!canAccessDistrict(electionId, countyId, districtId)) {
            throw new AccessDeniedException("User is not assigned to this district");
        }
    }

    public void requireCenterAccess(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId
    ) {
        if (!canAccessCenter(electionId, countyId, districtId, centerId)) {
            throw new AccessDeniedException("User is not assigned to this polling center");
        }
    }

    public void requirePlaceAccess(
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID placeId
    ) {
        if (!canAccessPlace(electionId, countyId, districtId, centerId, placeId)) {
            throw new AccessDeniedException("User is not assigned to this polling place");
        }
    }

    // ========================================================================
    // RAW ASSIGNED IDS
    // ========================================================================

    public Set<UUID> assignedCountyIds(UUID electionId) {
        return currentAssignments(electionId)
                .stream()
                .filter(assignment -> assignment.getCounty() != null)
                .map(assignment -> assignment.getCounty().getCountyId())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    public Set<UUID> assignedDistrictIds(UUID electionId) {
        return currentAssignments(electionId)
                .stream()
                .filter(assignment -> assignment.getDistrict() != null)
                .map(assignment -> assignment.getDistrict().getDistrictId())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    public Set<UUID> assignedCenterIds(UUID electionId) {
        return currentAssignments(electionId)
                .stream()
                .filter(assignment -> assignment.getCenter() != null)
                .map(assignment -> assignment.getCenter().getCenterId())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    public Set<UUID> assignedPlaceIds(UUID electionId) {
        return currentAssignments(electionId)
                .stream()
                .filter(assignment -> assignment.getPlace() != null)
                .map(assignment -> assignment.getPlace().getPlaceId())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    public UUID currentUserId() {
        TenantContext context = TenantContext.get();
        return context == null ? null : context.userId().orElse(null);
    }

    public UUID currentOrgId() {
        TenantContext context = TenantContext.get();
        return context == null ? null : context.orgId().orElse(null);
    }
}
