package election.ems_backend.service;

import election.ems_backend.dto.UserCreateRequest;
import election.ems_backend.dto.UserDto;
import election.ems_backend.dto.UserUpdateRequest;
import election.ems_backend.enums.RoleName;
import election.ems_backend.utility.ChangePasswordRequest;
import election.ems_backend.utility.UserSearchRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * FINAL tenant-aware SystemUser service API.
 * All read/write operations are scoped to the CURRENT tenant (X-Org-Id via TenantContext).
 */

public interface SystemUserService {
    /* ======================= Core CRUD / Query (Tenant-scoped) ======================= */

    /** Create a user inside the CURRENT tenant and auto-create org_membership(is_enabled=true). */
    UserDto createInTenant(UserCreateRequest req);

    UserDto createPlatformAdmin(UserCreateRequest req);

    // system user (no tenant)
    UserDto createTenantMemberRestricted(UserCreateRequest req); // tenant member, restricted roles

    UserDto createTenantAdmin(UserCreateRequest req);

    /** Get a user if they belong to the CURRENT tenant (via membership). */
    Optional<UserDto> getInTenant(UUID userId);

    /** Search CURRENT tenant users (text + flags). */
    Page<UserDto> searchInTenant(UserSearchRequest req, Pageable pageable);

    /** Update scalar fields for a tenant user (re-checks uniqueness on email/username). */
    UserDto updateInTenant(UUID userId, UserUpdateRequest req);

    UserDto assignUserToCountyAndRole(UUID userId, UUID countyId, String roleName);

    /* ======================= Status Flags ======================= */

    /** Soft enable/disable a tenant user. */
    void setActiveInTenant(UUID userId, boolean active);

    /** Verify/unverify a tenant user. */
    void setVerifiedInTenant(UUID userId, boolean verified);


    /* ======================= Credentials & Security ======================= */

    /** User-initiated password change (validates current password; updates lastPasswordChange). */
    void changePassword(UUID userId, ChangePasswordRequest req);

    void changePasswordPlatform(UUID userId, ChangePasswordRequest req);

    /** Admin password reset within CURRENT tenant. */
    void adminResetPasswordInTenant(UUID userId, String newPassword, boolean sendEmail);

    void adminResetPasswordPlatform(UUID userId, String newPassword, boolean sendEmail);

    /** Lock or unlock a tenant user; when unlocking, clears failed attempts. */
    void setLockInTenant(UUID userId, boolean lock, LocalDateTime until);

    /** Increment failed login attempts; locks when threshold reached (policy-based). */
    void recordLoginFailure(UUID userId);

    /** Record successful login: touch lastLogin, clear attempts & lock. */
    void recordLoginSuccess(UUID userId);


    /* ======================= Role & Affiliations ======================= */

    /** Assign role within CURRENT tenant (policy guards apply; e.g., cannot assign ADMIN unless platform admin). */
    void assignRoleInTenant(UUID userId, RoleName roleName);

    /** Attach/clear party affiliation within CURRENT tenant (pass null to clear). */
    void assignPartyInTenant(UUID userId, UUID partyId);

    /** Attach/clear county assignment within CURRENT tenant (pass null to clear). */
    void assignCountyInTenant(UUID userId, UUID countyId);

    /** Set/clear default organization used by multi-tenant UX (pass null to clear; typically defaults to current org). */
    void setDefaultOrgInTenant(UUID userId, UUID orgId);


    // New
    /**
     * Return user by username within the given tenant (orgId).
     */
    Optional<UserDto> getByUsernameInTenant(String username, UUID orgId);

    /**
     * Return user by UUID within the given tenant (orgId).
     */
    Optional<UserDto> getInTenant(UUID id, UUID orgId);

    Optional<UserDto> getPlatformUser(UUID userId);

    Optional<UserDto> getPlatformUserByUsername(String usernameOrEmail);

    Page<UserDto> searchPlatform(UserSearchRequest req, Pageable pageable);

    void setActivePlatform(UUID userId, boolean active);

    void setVerifiedPlatform(UUID userId, boolean verified);

    // SystemUserService.java
    UserDto updatePlatformUser(UUID userId, UserUpdateRequest req);



}
