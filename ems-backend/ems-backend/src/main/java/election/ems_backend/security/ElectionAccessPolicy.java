package election.ems_backend.security;

import election.ems_backend.entity.Election;
import election.ems_backend.entity.Organization;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.enums.ElectionAccessStatus;
import election.ems_backend.enums.OrganizationType;
import election.ems_backend.repository.OrganizationRepository;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.UUID;


/**
 * ========================================================================
 * ELECTION ACCESS POLICY
 * ========================================================================
 *
 * Central policy for election-level access.
 *
 * Election is a global/shared platform entity.
 *
 * Access is determined by:
 *
 * 1. User security domain
 *      - Platform/System user
 *      - Organization/Tenant user
 *
 * 2. Organization type
 *      - NEC
 *      - POLITICAL_PARTY
 *      - COALITION
 *      - NGO
 *      - MEDIA
 *      - OTHER
 *
 * 3. Election lifecycle
 *      - DRAFT
 *      - AVAILABLE
 *      - ARCHIVED
 *      - CANCELLED
 *
 * 4. Election timing
 *      - availableAt
 *      - startAt
 *      - endAt
 *      - availableUntil
 *
 *
 * IMPORTANT:
 *
 * OrganizationType.NEC is the hard election-authority boundary.
 *
 * A role such as ADMIN does NOT make a user an NEC user.
 *
 * Example:
 *
 * POLITICAL_PARTY + ADMIN
 *     != NEC administrator
 *
 * NEC + ADMIN
 *     = NEC organization administrator role
 *
 * NEC + NEC_ADMIN
 *     = NEC top organization administrator
 *
 *
 * Official result publication is NOT controlled by this policy.
 *
 * NECResult.isPublished controls official NEC result publication.
 * ========================================================================
 */
@Component
@RequiredArgsConstructor
public class ElectionAccessPolicy {

    private final AuthorizationService authz;

    private final SystemUserRepository systemUserRepository;

    private final OrganizationRepository organizationRepository;


    // ========================================================================
    // CURRENT USER DOMAIN
    // ========================================================================

    /**
     * Returns true when the authenticated account belongs to the
     * platform/system security domain.
     *
     * This uses SystemUser.isSystemUser and does not infer platform
     * status from ADMIN or from a missing organization.
     */
    public boolean isSystemUser() {

        UUID userId =
                currentUserId();

        if (userId == null) {
            return false;
        }


        return systemUserRepository
                .findById(userId)
                .filter(SystemUser::isActive)
                .map(SystemUser::isSystemUser)
                .orElse(false);
    }


    /**
     * Returns the OrganizationType for the current tenant context.
     *
     * Platform users may legitimately have no organization.
     */
    public OrganizationType currentOrganizationType() {

        UUID orgId =
                currentOrgId();

        if (orgId == null) {
            return null;
        }


        return organizationRepository
                .findById(orgId)
                .map(Organization::getOrganizationType)
                .orElse(null);
    }


    /**
     * True only when the current authenticated tenant is actually
     * an NEC organization.
     */
    public boolean isNecTenant() {

        return currentOrganizationType()
                == OrganizationType.NEC;
    }


    /**
     * True for any valid non-NEC organization.
     */
    public boolean isRegularTenant() {

        OrganizationType type =
                currentOrganizationType();

        return type != null
                && type != OrganizationType.NEC;
    }


    // ========================================================================
    // ELECTION MANAGEMENT AUTHORITY
    // ========================================================================

    /**
     * Requires authority to manage the global election definition.
     *
     * Allowed:
     *
     * - Platform SYSTEM_ADMIN
     * - NEC tenant NEC_ADMIN
     *
     * Not allowed:
     *
     * - Party ADMIN
     * - Coalition ADMIN
     * - Tenant ADMIN outside NEC
     * - Any user carrying NEC_ADMIN in a non-NEC organization
     */
    public void requireElectionAdministrator() {

        // --------------------------------------------------------------------
        // PLATFORM DOMAIN
        // --------------------------------------------------------------------

        if (isSystemUser()) {

            authz.requirePlatformAdmin();

            return;
        }


        // --------------------------------------------------------------------
        // ORGANIZATION DOMAIN
        // --------------------------------------------------------------------

        authz.requireMembership();


        if (!isNecTenant()) {

            throw new AccessDeniedException(
                    "Election administration requires the NEC organization"
            );
        }


        authz.requireAny(
                "NEC_ADMIN"
        );
    }


    /**
     * Election lifecycle administration uses the same hard authority boundary.
     */
    public void requireLifecycleAdministrator() {

        requireElectionAdministrator();
    }


    // ========================================================================
    // NEC ORGANIZATION ACCESS
    // ========================================================================

    /**
     * Requires the current user to be an enabled member of the NEC tenant.
     *
     * This does not require NEC_ADMIN.
     *
     * Useful when ordinary NEC operational users are allowed to read
     * internal election configuration.
     */
    public void requireNecTenant() {

        authz.requireMembership();


        if (!isNecTenant()) {

            throw new AccessDeniedException(
                    "NEC organization access required"
            );
        }
    }


    // ========================================================================
    // GENERAL READ ACCESS
    // ========================================================================

    /**
     * Determines whether the current caller may read an election.
     *
     * PLATFORM:
     * - Platform/system users may inspect the election registry.
     *
     * NEC:
     * - Enabled NEC members may read every lifecycle state.
     *
     * REGULAR TENANTS:
     * - Lifecycle/timing restrictions apply.
     */
    public boolean canRead(
            Election election
    ) {

        if (election == null) {
            return false;
        }


        // --------------------------------------------------------------------
        // SYSTEM DOMAIN
        // --------------------------------------------------------------------

        if (isSystemUser()) {
            return true;
        }


        // --------------------------------------------------------------------
        // TENANT DOMAIN
        // --------------------------------------------------------------------

        try {

            authz.requireMembership();

        } catch (RuntimeException ex) {

            return false;
        }


        OrganizationType organizationType =
                currentOrganizationType();


        if (organizationType == null) {
            return false;
        }


        // --------------------------------------------------------------------
        // NEC
        // --------------------------------------------------------------------

        if (
                organizationType
                        == OrganizationType.NEC
        ) {

            return true;
        }


        // --------------------------------------------------------------------
        // EVERY OTHER TENANT TYPE
        // --------------------------------------------------------------------

        return isTenantReadable(
                election,
                LocalDateTime.now()
        );
    }


    /**
     * Enforces election read access.
     */
    public void requireRead(
            Election election
    ) {

        if (!canRead(election)) {

            throw new AccessDeniedException(
                    "Election is not available to the current organization"
            );
        }
    }


    // ========================================================================
    // REGULAR TENANT VISIBILITY
    // ========================================================================

    /**
     * Election visibility rules for non-NEC organizations.
     *
     * Applies to:
     *
     * POLITICAL_PARTY
     * COALITION
     * NGO
     * MEDIA
     * OTHER
     *
     *
     * DRAFT:
     *     hidden
     *
     * AVAILABLE:
     *     visible when:
     *       - election is active
     *       - availableAt has been reached
     *       - availableUntil has not expired
     *
     * ARCHIVED:
     *     historical read-only visibility
     *
     * CANCELLED:
     *     visible only if the election had already been released
     */
    public boolean isTenantReadable(
            Election election,
            LocalDateTime now
    ) {

        if (
                election == null ||
                        now == null
        ) {

            return false;
        }


        ElectionAccessStatus status =
                election.getAccessStatus();


        if (status == null) {
            return false;
        }


        // ====================================================================
        // DRAFT
        // ====================================================================

        if (
                status
                        == ElectionAccessStatus.DRAFT
        ) {

            return false;
        }


        // ====================================================================
        // AVAILABLE
        // ====================================================================

        if (
                status
                        == ElectionAccessStatus.AVAILABLE
        ) {

            /*
             * Administrative/technical shutdown.
             */
            if (!election.isActive()) {
                return false;
            }


            LocalDateTime availableAt =
                    election.getAvailableAt();


            /*
             * AVAILABLE status alone is insufficient.
             *
             * NEC must have established the tenant availability time.
             */
            if (availableAt == null) {
                return false;
            }


            if (
                    now.isBefore(
                            availableAt
                    )
            ) {

                return false;
            }


            LocalDateTime availableUntil =
                    election.getAvailableUntil();


            /*
             * If the archive scheduler has not yet persisted ARCHIVED,
             * do not accidentally continue operational exposure beyond
             * availableUntil.
             */
            if (
                    availableUntil != null &&
                            now.isAfter(
                                    availableUntil
                            )
            ) {

                return false;
            }


            return true;
        }


        // ====================================================================
        // ARCHIVED
        // ====================================================================

        if (
                status
                        == ElectionAccessStatus.ARCHIVED
        ) {

            /*
             * Historical election remains visible.
             *
             * Individual child modules still enforce their own rules.
             *
             * Example:
             * NECResult still requires isPublished=true for tenant users.
             */
            return true;
        }


        // ====================================================================
        // CANCELLED
        // ====================================================================

        if (
                status
                        == ElectionAccessStatus.CANCELLED
        ) {

            /*
             * Do not reveal an election that NEC cancelled while it was
             * still an internal draft.
             *
             * If it had already been released, it remains available as
             * a historical/cancelled record.
             */
            LocalDateTime availableAt =
                    election.getAvailableAt();


            return availableAt != null
                    &&
                    !now.isBefore(
                            availableAt
                    );
        }


        return false;
    }


    // ========================================================================
    // PRE-ELECTION WINDOW
    // ========================================================================

    /**
     * Election has been released but normal election operations
     * have not started yet.
     */
    public boolean isPreElectionWindow(
            Election election
    ) {

        if (!baseOperationalEligibility(election)) {
            return false;
        }


        LocalDateTime startAt =
                election.getStartAt();


        if (startAt == null) {
            return false;
        }


        LocalDateTime now =
                LocalDateTime.now();


        return now.isBefore(
                startAt
        );
    }


    // ========================================================================
    // OPERATIONAL WINDOW
    // ========================================================================

    /**
     * True during:
     *
     * startAt <= now <= endAt
     */
    public boolean isOperational(
            Election election
    ) {

        if (!baseOperationalEligibility(election)) {
            return false;
        }


        LocalDateTime startAt =
                election.getStartAt();

        LocalDateTime endAt =
                election.getEndAt();


        if (
                startAt == null ||
                        endAt == null
        ) {

            return false;
        }


        LocalDateTime now =
                LocalDateTime.now();


        return !now.isBefore(startAt)
                &&
                !now.isAfter(endAt);
    }


    /**
     * Enforces operational-window access.
     *
     * Useful later for modules where the action must happen during
     * election operations.
     */
    public void requireOperational(
            Election election
    ) {

        requireRead(
                election
        );


        if (!isOperational(election)) {

            throw new AccessDeniedException(
                    "Election is outside its operational window"
            );
        }
    }


    // ========================================================================
    // POST-ELECTION WINDOW
    // ========================================================================

    /**
     * True after endAt and through availableUntil.
     *
     * Useful for:
     *
     * - submission completion
     * - verification
     * - reconciliation
     * - tally processing
     * - dispute review
     *
     * Actual permissions still belong to each module.
     */
    public boolean isPostElectionWindow(
            Election election
    ) {

        if (!baseOperationalEligibility(election)) {
            return false;
        }


        LocalDateTime endAt =
                election.getEndAt();

        LocalDateTime availableUntil =
                election.getAvailableUntil();


        if (
                endAt == null ||
                        availableUntil == null
        ) {

            return false;
        }


        LocalDateTime now =
                LocalDateTime.now();


        return now.isAfter(endAt)
                &&
                !now.isAfter(
                        availableUntil
                );
    }


    // ========================================================================
    // ARCHIVE ELIGIBILITY
    // ========================================================================

    /**
     * Returns true when an AVAILABLE election has reached its configured
     * archive deadline.
     */
    public boolean isArchiveDue(
            Election election
    ) {

        if (election == null) {
            return false;
        }


        if (
                election.getAccessStatus()
                        != ElectionAccessStatus.AVAILABLE
        ) {

            return false;
        }


        LocalDateTime availableUntil =
                election.getAvailableUntil();


        if (availableUntil == null) {
            return false;
        }


        return !LocalDateTime.now()
                .isBefore(
                        availableUntil
                );
    }


    // ========================================================================
    // WRITE / CONFIGURATION STATE
    // ========================================================================

    /**
     * Normal election configuration may be changed while the election is
     * DRAFT or AVAILABLE.
     *
     * ARCHIVED and CANCELLED require dedicated lifecycle/recovery logic.
     *
     * Authorization is separate from this state check.
     */
    public boolean allowsNormalConfigurationUpdate(
            Election election
    ) {

        if (
                election == null ||
                        election.getAccessStatus() == null
        ) {

            return false;
        }


        return election.getAccessStatus()
                == ElectionAccessStatus.DRAFT
                ||
                election.getAccessStatus()
                        == ElectionAccessStatus.AVAILABLE;
    }


    public void requireNormalConfigurationUpdate(
            Election election
    ) {

        requireElectionAdministrator();


        if (
                !allowsNormalConfigurationUpdate(
                        election
                )
        ) {

            throw new AccessDeniedException(
                    "Election does not allow normal configuration changes"
            );
        }
    }


    // ========================================================================
    // INTERNAL OPERATIONAL ELIGIBILITY
    // ========================================================================

    private boolean baseOperationalEligibility(
            Election election
    ) {

        if (election == null) {
            return false;
        }


        if (!election.isActive()) {
            return false;
        }


        return election.getAccessStatus()
                == ElectionAccessStatus.AVAILABLE;
    }


    // ========================================================================
    // TENANT CONTEXT
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