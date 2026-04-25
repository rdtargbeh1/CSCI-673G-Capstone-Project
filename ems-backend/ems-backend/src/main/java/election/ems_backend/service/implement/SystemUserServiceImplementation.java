package election.ems_backend.service.implement;

import election.ems_backend.dto.UserCreateRequest;
import election.ems_backend.dto.UserDto;
import election.ems_backend.dto.UserUpdateRequest;
import election.ems_backend.entity.*;
import election.ems_backend.enums.RoleName;
import election.ems_backend.integration.EmailService;
import election.ems_backend.mapper.UserMapper;
import election.ems_backend.repository.*;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.security.CurrentUserProvider;
import election.ems_backend.service.AuditLogService;
import election.ems_backend.service.NotificationService;
import election.ems_backend.service.SystemUserService;
import election.ems_backend.utility.ChangePasswordRequest;
import election.ems_backend.utility.QueryUtils;
import election.ems_backend.tenant.TenantContext;
import election.ems_backend.utility.UserSearchRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class SystemUserServiceImplementation implements SystemUserService {


    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCK_MINUTES        = 30;

    private final SystemUserRepository systemUserRepository;
    private final UserRoleRepository userRoleRepository;
    private final PartyRepository partyRepository;
    private final CountyRepository countyRepository;
    private final OrganizationRepository organizationRepository;
    private final FileUploadRepository fileUploadRepository;
    private final EmailService emailService;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final PasswordEncoder encoder;
    private final OrgMembershipRepository orgMembershipRepository;
    private final UserMapper mapper; // make this a @Component or MapStruct @Mapper(componentModel="spring")
    private final CurrentUserProvider currentUserProvider;

    private final AuthorizationService authz;
    private static final Logger log = LoggerFactory.getLogger(VoteSubmissionServiceImplementation.class);


    /* ======================= CREATE ======================= */


    /* ======================= CREATE ======================= */

    @Override
    @org.springframework.transaction.annotation.Transactional
    public UserDto createInTenant(UserCreateRequest req) {

        // 1) Determine if caller is platform SYSTEM_ADMIN from TenantContext
        TenantContext ctx = TenantContext.get();
        final boolean callerIsSystemAdmin = (ctx != null && ctx.isSystemAdmin());

        // 2) Resolve current tenant from TenantContext (X-Org-Id header or subdomain)
        UUID orgId = requireTenant();
        Organization tenant = organizationRepository.findById(orgId)
                .orElseThrow(() -> new NoSuchElementException("Organization not found"));

        // 3) Uniqueness checks
        ensureUniqueEmail(req.getEmail(), null);
        ensureUniqueUsername(req.getUserName(), null);

        // 4) Base platform role
        UserRole role = loadRole(req.getRoleName());

        // Only platform system admin can create ADMIN users
        if (role.getRoleName() == RoleName.ADMIN && !callerIsSystemAdmin) {
            throw new IllegalArgumentException("Only system admin can create ADMIN users");
        }

        // 5) Default organization
        Organization defaultOrg;
        if (req.getDefaultOrgId() != null) {
            defaultOrg = organizationRepository.findById(req.getDefaultOrgId())
                    .orElseThrow(() -> new NoSuchElementException("Default organization not found"));

            if (!callerIsSystemAdmin && !defaultOrg.getOrgId().equals(tenant.getOrgId())) {
                throw new IllegalArgumentException("Org admin cannot assign user to another organization");
            }
        } else {
            defaultOrg = tenant;
        }

        // 6) Neutral user (no party, no county yet)
        String encodedPassword = encoder.encode(req.getPassword());


        // Resolve optional profile image upload (preferred over a raw URL)
        FileUpload profileImageUpload = null;
        if (req.getProfileImageUploadId() != null) {
            profileImageUpload = fileUploadRepository.findById(req.getProfileImageUploadId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile image upload not found"));
        }

        SystemUser entity = mapper.toEntity(
                req,
                role,
                null,          // party
                null,          // county
                defaultOrg,
                encodedPassword,
                profileImageUpload
        );

        SystemUser saved = systemUserRepository.save(entity);

        // 7) Add user to org_membership for THIS tenant
        ensureMembership(tenant.getOrgId(), saved.getUserId(), role.getRoleName().name());

        return mapper.toDTO(saved);
    }


    /* ======================= UPDATE ======================= */

    @Override
    @org.springframework.transaction.annotation.Transactional
    public UserDto updateInTenant(UUID userId, UserUpdateRequest req) {
        UUID orgId = requireTenant();
        SystemUser u = loadTenantUser(orgId, userId);

        if (req.getEmail() != null && !u.getEmail().equalsIgnoreCase(req.getEmail())) {
            ensureUniqueEmail(req.getEmail(), u.getUserId());
        }
        if (req.getUserName() != null && !u.getUserName().equalsIgnoreCase(req.getUserName())) {
            ensureUniqueUsername(req.getUserName(), u.getUserId());
        }

        FileUpload profileImageUpload = null;
        if (req.getProfileImageUploadId() != null) {
            profileImageUpload = fileUploadRepository.findById(req.getProfileImageUploadId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile image upload not found"));
        }

        // ✅ IMPORTANT: pass profileImageUpload
        mapper.applyUpdate(req, u, profileImageUpload);

        if (req.getRoleName() != null) {
            UserRole role = loadRole(req.getRoleName());
            if (role.getRoleName() == RoleName.ADMIN && !callerIsPlatformAdmin()) {
                throw new IllegalArgumentException("Not allowed to assign ADMIN within a tenant");
            }
            u.setRole(role);
            syncMembershipRole(orgId, userId, role.getRoleName().name());
        }

        if (req.getPartyId() != null) u.setParty(loadParty(req.getPartyId()));
        if (req.getAssignedCountyId() != null) u.setAssignedCounty(loadCounty(req.getAssignedCountyId()));
        if (req.getDefaultOrgId() != null) u.setDefaultOrg(loadOrg(req.getDefaultOrgId()));

        return mapper.toDTO(u);
    }


    @Override
    @org.springframework.transaction.annotation.Transactional
    public UserDto createTenantMemberRestricted(UserCreateRequest req) {
        // Caller: PARTY_ADMIN/ADMIN/SYSTEM_ADMIN in tenant context
        // Enforce target role whitelist
        Set<RoleName> allowed = Set.of(
                RoleName.AGENT, RoleName.SUPERVISOR, RoleName.DATA_ENTRY,
                RoleName.OBSERVER, RoleName.COORDINATOR, RoleName.AUDITOR
        );
        RoleName target = req.getRoleName();
        if (target == null || !allowed.contains(target)) {
            throw new IllegalArgumentException("Role not allowed for tenant member creation");
        }
        // reuse your createInTenant path (which creates membership)
        return createInTenant(req);
    }


    @Override
    @org.springframework.transaction.annotation.Transactional
    public UserDto createTenantAdmin(UserCreateRequest req) {
        // Caller: SYSTEM_ADMIN (controller enforced)

        RoleName target = req.getRoleName();
        if (target == null ||
                (target != RoleName.ADMIN && target != RoleName.TENANT_ADMIN)) {
            throw new IllegalArgumentException("Role must be ADMIN or PARTY_ADMIN for this endpoint");
        }

        return createInTenant(req);
    }



    @Override
    @org.springframework.transaction.annotation.Transactional
    public UserDto createPlatformAdmin(UserCreateRequest req) {
        // Unscoped platform user (no tenant). Allowed only during bootstrap or by controller guard (SYSTEM_ADMIN).
        ensureUniqueEmail(req.getEmail(), null);
        ensureUniqueUsername(req.getUserName(), null);

        // dynamic role from request, fallback to OBSERVER
        UserRole baseRole = (req.getRoleName() != null)
                ? loadRole(req.getRoleName())
                : loadRole(RoleName.OBSERVER);

        String encoded = encoder.encode(req.getPassword());

        // Resolve optional profile image upload (preferred over URL)
        FileUpload profileImageUpload = null;
        if (req.getProfileImageUploadId() != null) {
            profileImageUpload = fileUploadRepository.findById(req.getProfileImageUploadId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile image upload not found"));
        }

        // Platform user: no party, county, or default org.
        SystemUser entity = mapper.toEntity(req, baseRole, null, null, null, encoded);

        // Only mark as platform owner if the role is SYSTEM_ADMIN
        entity.setSystemAdmin(baseRole.getRoleName() == RoleName.SYSTEM_ADMIN);
        entity.setVerified(true);
        entity.setActive(true);
        entity.setFailedLoginAttempts(0);
        entity.setLockedUntil(null);
        entity.setLastPasswordChange(LocalDateTime.now());

        SystemUser saved = systemUserRepository.save(entity);

        // NOTE: no OrgMembership is created for platform admins.
        return mapper.toDTO(saved);
    }



    @Override
    @org.springframework.transaction.annotation.Transactional
    public UserDto assignUserToCountyAndRole(UUID userId, UUID countyId, String roleName) {
        // 1) Only tenant ADMIN or SYSTEM_ADMIN can do this
        authz.requireAny("ADMIN", "SYSTEM_ADMIN");
        boolean callerIsSystemAdmin = authz.currentRoles().contains("SYSTEM_ADMIN");

        // 2) Current tenant (org)
        UUID orgId = requireTenant();
        Organization tenant = organizationRepository.findById(orgId)
                .orElseThrow(() -> new NoSuchElementException("Organization not found"));

        // 3) Load user & county
        SystemUser user = systemUserRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found"));

        County county = countyRepository.findById(countyId)
                .orElseThrow(() -> new NoSuchElementException("County not found"));

        // 4) Ensure user belongs to this tenant (must have membership)
        OrgMembership membership = orgMembershipRepository
                .findByOrganization_OrgIdAndUser_UserId(tenant.getOrgId(), user.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User is not a member of this organization"));

        // 5) Validate roleName (tenant-scoped roles)
        String normalizedRole = roleName == null ? null : roleName.trim().toUpperCase();
        if (normalizedRole == null || normalizedRole.isBlank()) {
            throw new IllegalArgumentException("Role name is required");
        }

        // Only allow tenant-scoped roles here (no SYSTEM_ADMIN via this API)
        Set<String> allowedRoles = Set.of(
                "ADMIN", "PARTY_ADMIN", "AGENT", "OBSERVER", "SUPERVISOR",
                "COORDINATOR", "DATA_ENTRY"
        );

        if (!allowedRoles.contains(normalizedRole)) {
            throw new IllegalArgumentException("Unsupported role for assignment: " + normalizedRole);
        }

        // Optional: prevent non-system-admin from assigning ADMIN at tenant level
        if ("ADMIN".equals(normalizedRole) && !callerIsSystemAdmin) {
            throw new IllegalArgumentException("Only system admin can assign ADMIN role");
        }

        // 6) Apply assignment
        user.setAssignedCounty(county);          // James Doe → Nimba County
        membership.setRoleName(normalizedRole);  // Role in this tenant → COORDINATOR

        // JPA will flush changes at transaction commit, but you can be explicit:
        systemUserRepository.save(user);
        orgMembershipRepository.save(membership);

        // 7) Return updated DTO
        return mapper.toDTO(user);
    }




    /* ======================= READ ======================= */

    @Override
    public Optional<UserDto> getInTenant(UUID userId) {
        UUID orgId = requireTenant();
        if (!callerIsPlatformAdmin()
                && !orgMembershipRepository.existsByOrganization_OrgIdAndUser_UserId(orgId, userId)) {
            return Optional.empty();
        }
        return systemUserRepository.findById(userId).map(mapper::toDTO);
    }

    @Override
    public Optional<UserDto> getInTenant(UUID id, UUID orgId) {
        // ensure check organization/tenant match in repository query
        return systemUserRepository.findByIdAndOrgId(id, orgId).map(mapper::toDTO);
    }



    @Override
    public Page<UserDto> searchInTenant(UserSearchRequest req, Pageable pageable) {
        UUID orgId = requireTenant();
        return systemUserRepository
                .findAllInOrg(
                        orgId,
                        QueryUtils.normalize(req != null ? req.getQ() : null),
                        req != null ? req.getActive() : null,
                        pageable
                )
                .map(mapper::toDTO);
    }

    @Override
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public Page<UserDto> searchPlatform(UserSearchRequest req, Pageable pageable) {
        Boolean active = (req == null) ? null : req.getActive();

        return systemUserRepository
                .findPlatformUsersOnly(active, pageable)
                .map(mapper::toDTO);
    }


    // inside SystemUserServiceImpl (or similar)

    @Override
    public Optional<UserDto> getByUsernameInTenant(String username, UUID orgId) {
        return systemUserRepository.findByUsernameAndOrgId(username, orgId).map(mapper::toDTO);
    }


    // -----------------------------
    // ✅ PLATFORM MODE LOOKUPS
    // -----------------------------
    @Override
    public Optional<UserDto> getPlatformUser(UUID userId) {
        return systemUserRepository.findById(userId)
                .filter(SystemUser::isActive) // platform-safe: still enforce active user
                .map(mapper::toDtoPlatform); // or toDto
    }

    @Override
    public Optional<UserDto> getPlatformUserByUsername(String usernameOrEmail) {
        if (usernameOrEmail == null || usernameOrEmail.isBlank()) {
            return Optional.empty();
        }

        String ident = usernameOrEmail.trim();

        Optional<SystemUser> userOpt = systemUserRepository.findByUserNameIgnoreCase(ident);

        if (userOpt.isEmpty() && ident.contains("@")) {
            userOpt = systemUserRepository.findByEmailIgnoreCase(ident);
        }

        return userOpt
                .filter(SystemUser::isActive)
                .map(mapper::toDtoPlatform); // or toDto
    }




    /* ======================= FLAGS ======================= */

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void setActiveInTenant(UUID userId, boolean active) {
        UUID orgId = requireTenant();
        SystemUser u = loadTenantUser(orgId, userId);
        u.setActive(active);
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void setVerifiedInTenant(UUID userId, boolean verified) {
        UUID orgId = requireTenant();
        SystemUser u = loadTenantUser(orgId, userId);
        u.setVerified(verified);
        if (verified) {
            u.setFailedLoginAttempts(0);
            u.setLockedUntil(null);
        }
    }

    /* ======================= CREDENTIALS ======================= */

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void changePassword(UUID userId, ChangePasswordRequest req) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("User is not authenticated");
        }

        UUID callerUserId;

        if (authentication instanceof JwtAuthenticationToken jwtAuth) {
            callerUserId = UUID.fromString(jwtAuth.getToken().getSubject());
        } else {
            throw new AccessDeniedException("Invalid authentication type");
        }

        boolean isSystemAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_SYSTEM_ADMIN".equals(a.getAuthority()));

        // Prevent changing another user's password unless system admin
        if (!isSystemAdmin && !callerUserId.equals(userId)) {
            throw new AccessDeniedException("You may only change your own password");
        }

        // Tenant guard
        TenantContext ctx = TenantContext.get();
        UUID orgId = (ctx != null) ? ctx.orgId().orElse(null) : null;

        if (orgId != null && !isSystemAdmin &&
                !orgMembershipRepository.existsByOrganization_OrgIdAndUser_UserId(orgId, userId)) {
            throw new IllegalArgumentException("User does not belong to current tenant");
        }

        SystemUser u = systemUserRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found"));

        if (!encoder.matches(req.getCurrentPassword(), u.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }

        u.setPassword(encoder.encode(req.getNewPassword()));
        u.setLastPasswordChange(LocalDateTime.now());
        u.setFailedLoginAttempts(0);
        u.setLockedUntil(null);

        systemUserRepository.save(u);
    }


    /**
     * ✅ Platform user self-service password change
     * No tenant context required.
     */
    @Override
    @Transactional
    public void changePasswordPlatform(UUID userId, ChangePasswordRequest req) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("User is not authenticated");
        }

        UUID callerUserId;

        if (authentication instanceof JwtAuthenticationToken jwtAuth) {
            callerUserId = UUID.fromString(jwtAuth.getToken().getSubject());
        } else {
            throw new AccessDeniedException("Invalid authentication type");
        }

        boolean isSystemAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_SYSTEM_ADMIN".equals(a.getAuthority()));

        // Prevent changing another user's password unless system admin
        if (!isSystemAdmin && !callerUserId.equals(userId)) {
            throw new AccessDeniedException("You may only change your own password");
        }

        SystemUser u = systemUserRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found"));

        if (!encoder.matches(req.getCurrentPassword(), u.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }

        u.setPassword(encoder.encode(req.getNewPassword()));
        u.setLastPasswordChange(LocalDateTime.now());
        u.setFailedLoginAttempts(0);
        u.setLockedUntil(null);

        systemUserRepository.save(u);
    }


    @Override
    @Transactional
    public void adminResetPasswordInTenant(UUID userId, String newPassword, boolean sendEmail) {

        UUID orgId = requireTenant();

        SystemUser u = loadTenantUser(orgId, userId);

        u.setPassword(encoder.encode(newPassword));
        u.setLastPasswordChange(LocalDateTime.now());
        u.setFailedLoginAttempts(0);
        u.setLockedUntil(null);

        if (sendEmail) {
            emailService.sendPasswordResetEmail(
                    u.getEmail(),
                    u.getUserName(),
                    newPassword
            );
        }
    }


    @Transactional
    public void adminResetPasswordPlatform(UUID userId, String newPassword, boolean sendEmail) {

        SystemUser u = systemUserRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found"));

        u.setPassword(encoder.encode(newPassword));
        u.setLastPasswordChange(LocalDateTime.now());
        u.setFailedLoginAttempts(0);
        u.setLockedUntil(null);

        if (sendEmail) {
            emailService.sendPasswordResetEmail(
                    u.getEmail(),
                    u.getUserName(),
                    newPassword
            );
        }
    }


    @Override
    @org.springframework.transaction.annotation.Transactional
    public void setLockInTenant(UUID userId, boolean lock, LocalDateTime until) {
        UUID orgId = requireTenant();
        SystemUser u = loadTenantUser(orgId, userId);
        if (lock) {
            u.setLockedUntil(until != null ? until : LocalDateTime.now().plusMinutes(LOCK_MINUTES));
        } else {
            u.setLockedUntil(null);
            u.setFailedLoginAttempts(0);
        }
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void recordLoginFailure(UUID userId) {
        systemUserRepository.findById(userId).ifPresent(u -> {
            u.setFailedLoginAttempts(u.getFailedLoginAttempts() + 1);
            if (u.getFailedLoginAttempts() >= MAX_FAILED_ATTEMPTS) {
                u.setLockedUntil(LocalDateTime.now().plusMinutes(LOCK_MINUTES));
            }
        });
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void recordLoginSuccess(UUID userId) {
        systemUserRepository.findById(userId).ifPresent(u -> {
            u.setLastLogin(LocalDateTime.now());
            u.setFailedLoginAttempts(0);
            u.setLockedUntil(null);
        });
    }

    /* ======================= ROLES & AFFILIATIONS ======================= */

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void assignRoleInTenant(UUID userId, RoleName roleName) {
        UUID orgId = requireTenant();
        SystemUser u = loadTenantUser(orgId, userId);
        UserRole role = loadRole(roleName);
        if (role.getRoleName() == RoleName.ADMIN && !callerIsPlatformAdmin()) {
            throw new IllegalArgumentException("Not allowed to assign ADMIN within a tenant");
        }
        u.setRole(role);
        syncMembershipRole(orgId, userId, role.getRoleName().name());
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void assignPartyInTenant(UUID userId, UUID partyId) {
        UUID orgId = requireTenant();
        SystemUser u = loadTenantUser(orgId, userId);
        u.setParty(partyId == null ? null : loadParty(partyId)); // can clear here
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void assignCountyInTenant(UUID userId, UUID countyId) {
        UUID orgId = requireTenant();
        SystemUser u = loadTenantUser(orgId, userId);
        u.setAssignedCounty(countyId == null ? null : loadCounty(countyId));
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void setDefaultOrgInTenant(UUID userId, UUID orgId) {
        UUID current = requireTenant();
        SystemUser u = loadTenantUser(current, userId);
        if (orgId == null) {
            u.setDefaultOrg(null);
        } else {
            Organization o = loadOrg(orgId);
            u.setDefaultOrg(o);
        }
    }


    /* ======================= HELPERS ======================= */

    private UUID requireTenant() {
        TenantContext c = TenantContext.get();
        UUID orgId = (c != null) ? c.orgId().orElse(null) : null;
        if (orgId == null && !callerIsPlatformAdmin()) {
            throw new IllegalStateException("X-Org-Id is required");
        }
        return orgId; // may be null for platform admin operations
    }

    private SystemUser loadTenantUser(UUID orgId, UUID userId) {
        if (!callerIsPlatformAdmin()) {
            if (orgId == null) throw new IllegalStateException("X-Org-Id is required");
            if (!orgMembershipRepository.existsByOrganization_OrgIdAndUser_UserId(orgId, userId)) {
                throw new IllegalArgumentException("User not in current tenant");
            }
        }
        return systemUserRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found"));
    }

    private boolean callerIsPlatformAdmin() {
        UUID me = currentUserProvider.currentUserId();
        if (me == null) return false;
        return systemUserRepository.findById(me)
                .map(SystemUser::isSystemAdmin)
                .orElse(false);
    }

    private void ensureUniqueEmail(String email, UUID excludeUserId) {
        systemUserRepository.findByEmailIgnoreCase(email).ifPresent(existing -> {
            if (excludeUserId == null || !existing.getUserId().equals(excludeUserId)) {
                throw new IllegalArgumentException("Email already in use");
            }
        });
    }

    private void ensureUniqueUsername(String userName, UUID excludeUserId) {
        systemUserRepository.findByUserNameIgnoreCase(userName).ifPresent(existing -> {
            if (excludeUserId == null || !existing.getUserId().equals(excludeUserId)) {
                throw new IllegalArgumentException("Username already in use");
            }
        });
    }

    private UserRole loadRole(RoleName roleName) {
        return userRoleRepository.findByRoleName(roleName)
                .orElseThrow(() -> new NoSuchElementException("Role not found: " + roleName));
    }
    private Party loadParty(UUID partyId) {
        return partyRepository.findById(partyId)
                .orElseThrow(() -> new NoSuchElementException("Party not found: " + partyId));
    }

    private County loadCounty(UUID countyId) {
        return countyRepository.findById(countyId)
                .orElseThrow(() -> new NoSuchElementException("County not found: " + countyId));
    }

    private Organization loadOrg(UUID orgId) {
        return organizationRepository.findById(orgId)
                .orElseThrow(() -> new NoSuchElementException("Organization not found: " + orgId));
    }

    private void ensureMembership(UUID orgId, UUID userId, String roleNameText) {
        if (orgMembershipRepository.existsByOrganization_OrgIdAndUser_UserId(orgId, userId)) {
            syncMembershipRole(orgId, userId, roleNameText);
            return;
        }
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new NoSuchElementException("Organization not found"));
        SystemUser user = systemUserRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found"));

        OrgMembership m = new OrgMembership();
        m.setOrganization(org);
        m.setUser(user);
        m.setRoleName(roleNameText);
        m.setEnabled(true);
        orgMembershipRepository.save(m);
    }

    private void syncMembershipRole(UUID orgId, UUID userId, String roleNameText) {
        orgMembershipRepository.findByOrganization_OrgIdAndUser_UserId(orgId, userId)
                .ifPresent(m -> m.setRoleName(roleNameText));
    }


    @Override
    @org.springframework.transaction.annotation.Transactional
    public void setActivePlatform(UUID userId, boolean active) {
        authz.requirePlatformAdmin(); // SYSTEM_ADMIN (platform owner) guard
        SystemUser u = systemUserRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found"));

        // ✅ optional safety: only platform users (no org membership / no default org)
        // if you want to restrict:
        // if (u.getDefaultOrg() != null) throw new IllegalArgumentException("Not a platform user");

        u.setActive(active);
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void setVerifiedPlatform(UUID userId, boolean verified) {
        authz.requirePlatformAdmin();
        SystemUser u = systemUserRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found"));

        u.setVerified(verified);
        if (verified) {
            u.setFailedLoginAttempts(0);
            u.setLockedUntil(null);
        }
    }


    @Override
    @Transactional
    public UserDto updatePlatformUser(UUID userId, UserUpdateRequest req) {
        authz.requirePlatformAdmin(); // SYSTEM_ADMIN only (platform owner)

        SystemUser u = systemUserRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("User not found"));

        // ✅ Uniqueness checks
        if (req.getEmail() != null && !req.getEmail().equalsIgnoreCase(u.getEmail())) {
            ensureUniqueEmail(req.getEmail(), u.getUserId());
        }
        if (req.getUserName() != null && !req.getUserName().equalsIgnoreCase(u.getUserName())) {
            ensureUniqueUsername(req.getUserName(), u.getUserId());
        }

        // Optional profile image upload
        FileUpload profileImageUpload = null;
        if (req.getProfileImageUploadId() != null) {
            profileImageUpload = fileUploadRepository.findById(req.getProfileImageUploadId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile image upload not found"));
        }

        // ✅ Apply basic update
        mapper.applyUpdate(req, u, profileImageUpload);

        // ✅ Allow changing platform role (SYSTEM_ADMIN / NEC_ADMIN / ADMIN / PARTY_ADMIN ...)
        if (req.getRoleName() != null) {
            UserRole role = loadRole(req.getRoleName());
            u.setRole(role);

            // only mark as owner if SYSTEM_ADMIN
            u.setSystemAdmin(role.getRoleName() == RoleName.SYSTEM_ADMIN);
        }

        return mapper.toDTO(u);
    }



}


