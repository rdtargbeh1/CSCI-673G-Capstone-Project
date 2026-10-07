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
 * Portal rule:
 *
 *     Administrative role -> Administrative Portal
 *     Operational role    -> Operations Portal
 *
 * Portal selection does NOT require an election.
 *
 * Election-specific authority remains the intersection of:
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

    // ========================================================================
    // CURRENT ROLE
    // ========================================================================

    public Set<String> currentRoles() {
        return authz.currentRoles();
    }

    // ========================================================================
    // ROLE FAMILIES
    // ========================================================================

    public boolean isAdministrativeRole() {
        return containsAny(
                currentRoles(),
                ADMINISTRATIVE_ROLES
        );
    }

    public boolean isOperationalRole() {
        return containsAny(
                currentRoles(),
                OPERATIONAL_ROLES
        );
    }

    /**
     * Used by shared backend operational policies.
     *
     * Administrators may still use operational resources through their
     * existing administrative portal.
     *
     * Regular operational users use those resources through the dedicated
     * Operations Portal.
     */
    public boolean canUseOperations() {
        return isAdministrativeRole()
                || isOperationalRole();
    }

    // ========================================================================
    // PORTAL ACCESS
    // ========================================================================

    /**
     * Administrative Portal eligibility.
     *
     * No election is required to answer this question.
     */
    public boolean canAccessAdministrativePortal() {
        return isAdministrativeRole();
    }

    /**
     * Operations Portal eligibility.
     *
     * No election is required to answer this question.
     *
     * Election assignment is checked later when election-scoped data is
     * requested.
     */
    public boolean canAccessOperationsPortal() {
        return isOperationalRole();
    }

    // ========================================================================
    // ELECTION ASSIGNMENT ELIGIBILITY
    // ========================================================================

    public boolean canReceiveElectionAssignment(
            String roleName
    ) {

        String normalized =
                normalize(roleName);

        return normalized != null
                && OPERATIONAL_ROLES.contains(normalized);
    }

    public void requireAssignableRole(
            String roleName
    ) {

        if (!canReceiveElectionAssignment(roleName)) {

            throw new AccessDeniedException(
                    "Election geographic assignments are reserved for operational roles"
            );
        }
    }

    /**
     * IMPORTANT:
     *
     * The precise role -> allowed scope matrix must remain a separately
     * approved administrative assignment rule.
     *
     * Do not infer job authority from geographic scope.
     *
     * This method intentionally preserves the current backend assignment
     * eligibility until the final role/scope matrix is explicitly locked.
     */
    public boolean canReceiveScope(
            String roleName,
            AssignmentScope scope
    ) {

        return scope != null
                && canReceiveElectionAssignment(roleName);
    }

    public void requireAssignableScope(
            String roleName,
            AssignmentScope scope
    ) {

        if (!canReceiveScope(
                roleName,
                scope
        )) {

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

    /**
     * Allocations are read-only reference resources for regular operational
     * users.
     *
     * Every Operations-capable role may read allocations inside its authorized
     * election/geographic scope.
     */
    public boolean canViewAllocations() {
        return canUseOperations();
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

    // ========================================================================
    // OBSERVER REPORT ROLE AUTHORITY
    // ========================================================================

    public boolean canViewObserverReports() {
        return canUseOperations();
    }

    public boolean canCreateObserverReport() {

        return hasAnyRole(
                "SYSTEM_ADMIN",
                "NEC_ADMIN",
                "TENANT_ADMIN",
                "ADMIN",

                "OBSERVER",
                "FIELD_OFFICER",
                "PRESIDING_OFFICER",
                "SUPERVISOR",
                "COORDINATOR"
        );
    }

    public boolean canReviewObserverReports() {

        return hasAnyRole(
                "SYSTEM_ADMIN",
                "NEC_ADMIN",
                "TENANT_ADMIN",
                "ADMIN",

                "SUPERVISOR",
                "COORDINATOR"
        );
    }

    /**
     * Administrative roles retain their existing delete authority.
     *
     * Operational delete remains role-limited to OBSERVER and SUPERVISOR.
     * OperationObserverReportPolicy adds the required scope/resource checks.
     */
    public boolean canDeleteObserverReport() {

        return isAdministrativeRole()
                || hasAnyRole(
                "OBSERVER",
                "SUPERVISOR"
        );
    }

    // ========================================================================
    // DISCREPANCIES
    // ========================================================================

    /**
     * Operational workspace:
     * discrepancies are read-only.
     */
    public boolean canViewDiscrepancies() {
        return canUseOperations();
    }

    /**
     * Administrative workflows may still manage discrepancies.
     *
     * Regular operational users cannot mutate discrepancy records through the
     * Operations Portal.
     */
    public boolean canManageDiscrepancies() {
        return isAdministrativeRole();
    }

    // ========================================================================
    // REPORTS
    // ========================================================================

    public boolean canViewScopedReports() {
        return canUseOperations();
    }

    /**
     * WHAT-level report generation authority.
     *
     * OperationResourcePolicy applies the additional scope ceiling:
     *
     *     COUNTY
     *     DISTRICT
     *     CENTER
     *
     * for operational users.
     */
    public boolean canGenerateScopedReports() {

        return hasAnyRole(
                "SYSTEM_ADMIN",
                "NEC_ADMIN",
                "TENANT_ADMIN",
                "ADMIN",

                "TALLY_OFFICER",
                "AUDITOR",
                "SUPERVISOR",
                "COORDINATOR"
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
                "SYSTEM_ADMIN",
                "NEC_ADMIN",
                "TENANT_ADMIN",
                "ADMIN",

                "FIELD_OFFICER",
                "PRESIDING_OFFICER",
                "DATA_ENTRY"
        );
    }

    public boolean canEditSubmission() {

        return hasAnyRole(
                "SYSTEM_ADMIN",
                "NEC_ADMIN",
                "TENANT_ADMIN",
                "ADMIN",

                "FIELD_OFFICER",
                "PRESIDING_OFFICER",
                "DATA_ENTRY"
        );
    }

    public boolean canVerifySubmission() {

        return hasAnyRole(
                "SYSTEM_ADMIN",
                "NEC_ADMIN",
                "TENANT_ADMIN",
                "ADMIN",

                "TALLY_OFFICER",
                "SUPERVISOR"
        );
    }

    public boolean canFlagSubmission() {

        return hasAnyRole(
                "SYSTEM_ADMIN",
                "NEC_ADMIN",
                "TENANT_ADMIN",
                "ADMIN",

                "TALLY_OFFICER",
                "SUPERVISOR",
                "COORDINATOR"
        );
    }

    public boolean canAmendSubmission() {

        return hasAnyRole(
                "SYSTEM_ADMIN",
                "NEC_ADMIN",
                "TENANT_ADMIN",
                "ADMIN",

                "TALLY_OFFICER"
        );
    }

    public boolean canDeleteSubmission() {
        return isAdministrativeRole();
    }

    public boolean canResubmitSubmission() {

        return hasAnyRole(
                "SYSTEM_ADMIN",
                "NEC_ADMIN",
                "TENANT_ADMIN",
                "ADMIN",

                "FIELD_OFFICER",
                "PRESIDING_OFFICER",
                "DATA_ENTRY"
        );
    }

    public boolean canReopenSubmission() {
        return isAdministrativeRole();
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    private boolean hasAnyRole(
            String... roles
    ) {

        Set<String> current =
                currentRoles();

        if (
                current == null
                        || current.isEmpty()
                        || roles == null
        ) {
            return false;
        }

        for (String role : roles) {

            String normalized =
                    normalize(role);

            if (
                    normalized != null
                            && current.contains(normalized)
            ) {
                return true;
            }
        }

        return false;
    }

    private boolean containsAny(
            Set<String> current,
            Set<String> expected
    ) {

        if (
                current == null
                        || current.isEmpty()
                        || expected == null
                        || expected.isEmpty()
        ) {
            return false;
        }

        for (String role : expected) {

            if (current.contains(role)) {
                return true;
            }
        }

        return false;
    }

    private String normalize(
            String roleName
    ) {

        if (
                roleName == null
                        || roleName.isBlank()
        ) {
            return null;
        }

        String role =
                roleName
                        .trim()
                        .toUpperCase(Locale.ROOT);

        if (role.startsWith("ROLE_")) {
            role =
                    role.substring(
                            "ROLE_".length()
                    );
        }

        return role;
    }
}

