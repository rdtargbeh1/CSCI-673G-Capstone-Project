package election.ems_backend.policy;

import election.ems_backend.enums.AssignmentScope;
import election.ems_backend.security.AuthorizationService;

import lombok.RequiredArgsConstructor;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Set;

/**
 * ========================================================================
 * OPERATION ROLE POLICY
 * ========================================================================
 *
 * Defines WHAT authority a role has inside Election Operations.
 *
 * Geographic reach is intentionally NOT decided here.
 * OperationAccessPolicy determines WHERE that authority may be exercised.
 *
 * Administrative roles:
 *     SYSTEM_ADMIN, NEC_ADMIN, TENANT_ADMIN, ADMIN
 *
 * Operational roles:
 *     TALLY_OFFICER, AUDITOR, COORDINATOR, OBSERVER, SUPERVISOR,
 *     FIELD_OFFICER, PRESIDING_OFFICER, DATA_ENTRY
 *
 * Final authorization is the intersection of:
 *
 *     role authority
 *     + organization/election boundary
 *     + assignment scope
 *     + resource ownership/location
 *     + workflow state
 * ========================================================================
 */
@Component
@RequiredArgsConstructor
public class OperationRolePolicy {

    private static final Set<String> ADMINISTRATIVE_ROLES = Set.of(
            "SYSTEM_ADMIN",
            "NEC_ADMIN",
            "TENANT_ADMIN",
            "ADMIN"
    );

    private static final Set<String> OPERATIONAL_ROLES = Set.of(
            "TALLY_OFFICER",
            "AUDITOR",
            "COORDINATOR",
            "OBSERVER",
            "SUPERVISOR",
            "FIELD_OFFICER",
            "PRESIDING_OFFICER",
            "DATA_ENTRY"
    );

    private final AuthorizationService authz;

    public Set<String> currentRoles() {
        return authz.currentRoles();
    }

    public boolean isAdministrativeRole() {
        return containsAny(currentRoles(), ADMINISTRATIVE_ROLES);
    }

    public boolean isOperationalRole() {
        return containsAny(currentRoles(), OPERATIONAL_ROLES);
    }

    public boolean canUseOperations() {
        return isAdministrativeRole() || isOperationalRole();
    }

    public boolean canReceiveElectionAssignment(String roleName) {
        String normalized = normalize(roleName);
        return normalized != null && OPERATIONAL_ROLES.contains(normalized);
    }

    public void requireAssignableRole(String roleName) {
        if (!canReceiveElectionAssignment(roleName)) {
            throw new AccessDeniedException(
                    "Election geographic assignments are reserved for operational roles"
            );
        }
    }

    /**
     * All operational roles may be assigned any supported geographic scope.
     * Scope changes reach, not the role's authority.
     */
    public boolean canReceiveScope(String roleName, AssignmentScope scope) {
        return scope != null && canReceiveElectionAssignment(roleName);
    }

    public void requireAssignableScope(String roleName, AssignmentScope scope) {
        if (!canReceiveScope(roleName, scope)) {
            throw new AccessDeniedException(
                    "Role is not eligible for the requested election assignment scope"
            );
        }
    }

    // ========================================================================
    // SHARED OPERATIONAL READ ACCESS
    // ========================================================================

    public boolean canViewOperationalReferenceData() {
        return canUseOperations();
    }

    public boolean canViewGeography() {
        return canUseOperations();
    }

    public boolean canViewAllocations() {
        return hasAnyRole(
                "SYSTEM_ADMIN", "NEC_ADMIN", "TENANT_ADMIN", "ADMIN",
                "TALLY_OFFICER", "AUDITOR", "COORDINATOR", "SUPERVISOR",
                "FIELD_OFFICER", "PRESIDING_OFFICER", "DATA_ENTRY"
        );
    }

    public boolean canViewOperationalContacts() {
        return canUseOperations();
    }

    public boolean canViewSubmissionHistory() {
        return canUseOperations();
    }

    public boolean canViewTallySheets() {
        return canUseOperations();
    }

    public boolean canViewVoteTallies() {
        return canUseOperations();
    }

    public boolean canViewObserverReports() {
        return canUseOperations();
    }

    public boolean canCreateObserverReport() {
        return hasAnyRole(
                "SYSTEM_ADMIN", "NEC_ADMIN", "TENANT_ADMIN", "ADMIN",
                "OBSERVER", "FIELD_OFFICER", "PRESIDING_OFFICER",
                "SUPERVISOR", "COORDINATOR"
        );
    }

    public boolean canReviewObserverReports() {
        return hasAnyRole(
                "SYSTEM_ADMIN", "NEC_ADMIN", "TENANT_ADMIN", "ADMIN",
                "SUPERVISOR", "COORDINATOR"
        );
    }

    /**
     * ObserverReport delete authority.
     *
     * Geographic scope is NOT decided here.
     *
     * Administrative roles retain their existing delete authority.
     * Operational delete authority is limited to OBSERVER and SUPERVISOR.
     *
     * FIELD_OFFICER cannot delete ObserverReport records.
     */
    public boolean canDeleteObserverReport() {
        return isAdministrativeRole()
                || hasAnyRole(
                "OBSERVER",
                "SUPERVISOR"
        );
    }

    public boolean canViewDiscrepancies() {
        return canUseOperations();
    }

    public boolean canManageDiscrepancies() {
        return hasAnyRole(
                "SYSTEM_ADMIN", "NEC_ADMIN", "TENANT_ADMIN", "ADMIN",
                "TALLY_OFFICER", "SUPERVISOR", "COORDINATOR"
        );
    }

    public boolean canViewScopedReports() {
        return canUseOperations();
    }

    public boolean canGenerateScopedReports() {
        return hasAnyRole(
                "SYSTEM_ADMIN", "NEC_ADMIN", "TENANT_ADMIN", "ADMIN",
                "TALLY_OFFICER", "AUDITOR", "SUPERVISOR", "COORDINATOR"
        );
    }

    // ========================================================================
    // VOTE SUBMISSION ROLE AUTHORITY
    // ========================================================================

    public boolean canViewSubmission() {
        return canUseOperations();
    }

    public boolean canCreateSubmission() {
        return hasAnyRole(
                "SYSTEM_ADMIN", "NEC_ADMIN", "TENANT_ADMIN", "ADMIN",
                "FIELD_OFFICER", "PRESIDING_OFFICER", "DATA_ENTRY"
        );
    }

    public boolean canEditSubmission() {
        return hasAnyRole(
                "SYSTEM_ADMIN", "NEC_ADMIN", "TENANT_ADMIN", "ADMIN",
                "FIELD_OFFICER", "PRESIDING_OFFICER", "DATA_ENTRY"
        );
    }

    public boolean canVerifySubmission() {
        return hasAnyRole(
                "SYSTEM_ADMIN", "NEC_ADMIN", "TENANT_ADMIN", "ADMIN",
                "TALLY_OFFICER", "SUPERVISOR"
        );
    }

    public boolean canFlagSubmission() {
        return hasAnyRole(
                "SYSTEM_ADMIN", "NEC_ADMIN", "TENANT_ADMIN", "ADMIN",
                "TALLY_OFFICER", "SUPERVISOR", "COORDINATOR"
        );
    }

    public boolean canAmendSubmission() {
        return hasAnyRole(
                "SYSTEM_ADMIN", "NEC_ADMIN", "TENANT_ADMIN", "ADMIN",
                "TALLY_OFFICER"
        );
    }

    public boolean canDeleteSubmission() {
        return isAdministrativeRole();
    }

    public boolean canResubmitSubmission() {
        return hasAnyRole(
                "SYSTEM_ADMIN", "NEC_ADMIN", "TENANT_ADMIN", "ADMIN",
                "FIELD_OFFICER", "PRESIDING_OFFICER", "DATA_ENTRY"
        );
    }

    public boolean canReopenSubmission() {
        return isAdministrativeRole();
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private boolean hasAnyRole(String... roles) {
        Set<String> current = currentRoles();
        if (current == null || current.isEmpty() || roles == null) {
            return false;
        }

        for (String role : roles) {
            if (role != null && current.contains(role)) {
                return true;
            }
        }

        return false;
    }

    private boolean containsAny(Set<String> current, Set<String> expected) {
        if (current == null || current.isEmpty()) {
            return false;
        }

        for (String role : expected) {
            if (current.contains(role)) {
                return true;
            }
        }

        return false;
    }

    private String normalize(String roleName) {
        if (roleName == null || roleName.isBlank()) {
            return null;
        }
        return roleName.trim().toUpperCase(Locale.ROOT);
    }
}
