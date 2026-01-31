package election.ems_backend.service.implement;

import election.ems_backend.dto.MemberSearchRequest;
import election.ems_backend.dto.MembershipCreateRequest;
import election.ems_backend.dto.OrgMembershipDto;
import election.ems_backend.entity.OrgMembership;
import election.ems_backend.entity.Organization;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.entity.UserRole;
import election.ems_backend.enums.RoleName;
import election.ems_backend.mapper.OrgMembershipMapper;
import election.ems_backend.repository.OrgMembershipRepository;
import election.ems_backend.repository.OrganizationRepository;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.repository.UserRoleRepository;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.security.CurrentUserProvider;
import election.ems_backend.service.OrgMembershipService;
import election.ems_backend.utility.QueryUtils;
import election.ems_backend.tenant.TenantContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@Transactional
public class OrgMembershipServiceImplementation implements OrgMembershipService {

    @Autowired
    private OrgMembershipRepository orgMembershipRepository;
    @Autowired
    private SystemUserRepository users;
    @Autowired
    private OrganizationRepository orgs;
    @Autowired
    private CurrentUserProvider currentUserProvider;
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private AuthorizationService authz;
    @Autowired
    private UserRoleRepository userRoleRepository;

    private  final OrgMembershipMapper mapper = new OrgMembershipMapper();



    @Override
    @Transactional(readOnly = true)
    public Page<OrgMembershipDto> listInTenant(MemberSearchRequest req, Pageable pageable) {
        UUID orgId = requireTenant();
        return orgMembershipRepository.searchInOrg(
                orgId,
                QueryUtils.normalize(req != null ? req.getQ() : null),
                req != null ? req.getRoleName() : null,
                req != null ? req.getEnabled() : null,
                pageable
        ).map(mapper::toDTO);
    }


    @Override
    public OrgMembershipDto addMemberInTenant(MembershipCreateRequest req) {
        UUID orgId = requireTenant();
        Organization org = orgs.findById(orgId)
                .orElseThrow(() -> new NoSuchElementException("Organization not found"));

        SystemUser user = users.findById(req.getUserId())
                .orElseThrow(() -> new NoSuchElementException("User not found"));

        if (orgMembershipRepository.existsByOrganization_OrgIdAndUser_UserId(orgId, user.getUserId())) {
            throw new IllegalArgumentException("User is already a member of this organization");
        }

        // Prevent assigning ADMIN role unless caller is platform admin
        if ("ADMIN".equalsIgnoreCase(req.getRoleName()) && !callerIsPlatformAdmin()) {
            throw new IllegalArgumentException("Only platform admin can assign ADMIN role");
        }


        OrgMembership m = new OrgMembership();
        m.setOrganization(org);
        m.setUser(user);
        m.setRoleName(req.getRoleName());
        m.setEnabled(true);

        OrgMembership saved = orgMembershipRepository.save(m);

        // Audit log (best-effort)
        try {
            UUID actor = currentUserProvider.currentUserId();
            String desc = "Added membership: user=" + user.getUserId() + " role=" + req.getRoleName();
            jdbc.update("INSERT INTO audit_log (log_id, org_id, user_id, activity_type, entity_affected, action_description) VALUES (gen_random_uuid(), ?, ?, ?, ?, ?)",
                    new Object[]{ org.getOrgId(), actor, "MEMBERSHIP_ADD", "org_membership", desc });
        } catch (Exception ignored) {}

        return mapper.toDTO(saved);
    }


    @Override
    public void setRoleInTenant(UUID userId, String roleName) {
        // Only tenant ADMIN or platform admin may change membership roles
        authz.requireAny("ADMIN", "PARTY_ADMIN");

        UUID orgId = requireTenant();

        // Validate target membership
        OrgMembership membership = orgMembershipRepository.findByOrganization_OrgIdAndUser_UserId(orgId, userId)
                .orElseThrow(() -> new NoSuchElementException("Membership not found in current tenant"));

        // Prevent non-platform admin from assigning critical roles
        if (isHighLevelRole(roleName) && !callerIsPlatformAdmin()) {
            throw new IllegalArgumentException("High-level roles can only be assigned by system admins.");
        }

        // Resolve the UserRole entity corresponding to the roleName string
        UserRole newRole = userRoleRepository.findByRoleName(RoleName.valueOf(roleName))
                .orElseThrow(() -> new NoSuchElementException("Role not found: " + roleName));

        SystemUser user = users.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("System user not found"));

        // Track old roles for audit
        String oldMembershipRole = membership.getRoleName();
        UserRole oldSystemRole = user.getRole();

        // Update membership role
        membership.setRoleName(roleName);

        // Update SystemUser role reference to the resolved UserRole entity
        user.setRole(newRole);

        // Persist changes
        users.save(user); // Update SystemUser role
        orgMembershipRepository.save(membership); // Update OrgMembership role

        // Audit both changes
        try {
            UUID actor = currentUserProvider.currentUserId();
            String description = String.format(
                    "Changed membership role for user=%s in org=%s from=%s to=%s, and updated user system role from=%s to=%s",
                    userId, orgId, oldMembershipRole, roleName, oldSystemRole.getRoleName(), newRole.getRoleName()
            );
            jdbc.update(
                    "INSERT INTO audit_log (log_id, org_id, user_id, activity_type, entity_affected, action_description) VALUES (gen_random_uuid(), ?, ?, ?, ?, ?)",
                    new Object[]{orgId, actor, "ROLE_UPDATE", "org_membership/system_user", description}
            );
        } catch (Exception ignored) {}
    }


    @Override
    public void setEnabledInTenant(UUID userId, boolean enabled) {
        // Only tenant ADMIN or platform admin may enable/disable membership
        authz.requireAnyInTenantOrPlatformAdmin("PARTY_ADMIN","SYSTEM_ADMIN","NEC_ADMIN");

        UUID orgId = requireTenant();
        OrgMembership m = orgMembershipRepository.findByOrganization_OrgIdAndUser_UserId(orgId, userId)
                .orElseThrow(() -> new NoSuchElementException("Membership not found in current tenant"));

        m.setEnabled(enabled);

        // Audit
        try {
            UUID actor = currentUserProvider.currentUserId();
            String desc = "Set membership enabled=" + enabled + " for user=" + userId;
            jdbc.update("INSERT INTO audit_log (log_id, org_id, user_id, activity_type, entity_affected, action_description) VALUES (gen_random_uuid(), ?, ?, ?, ?, ?)",
                    new Object[]{ orgId, actor, "MEMBERSHIP_SET_ENABLED", "org_membership", desc });
        } catch (Exception ignored) {}
    }

    @Override
    public void removeMemberInTenant(UUID userId) {
        // Only tenant ADMIN or system admin may remove members
        authz.requireAnyInTenantOrPlatformAdmin("PARTY_ADMIN","SYSTEM_ADMIN","NEC_ADMIN");

        UUID orgId = requireTenant();
        OrgMembership m = orgMembershipRepository.findByOrganization_OrgIdAndUser_UserId(orgId, userId)
                .orElseThrow(() -> new NoSuchElementException("Membership not found in current tenant"));

        // Prevent removing last enabled ADMIN in the org unless caller is platform admin
        boolean removingAdmin = "ADMIN".equalsIgnoreCase(m.getRoleName()) && m.isEnabled();
        if (removingAdmin && !callerIsPlatformAdmin()) {
            long admins = orgMembershipRepository.countByOrganization_OrgIdAndRoleNameAndIsEnabledTrue(orgId, "ADMIN");
            if (admins <= 1) {
                throw new IllegalStateException("Cannot remove the last enabled ADMIN for the organization");
            }
        }

        orgMembershipRepository.delete(m);

        // Audit
        try {
            UUID actor = currentUserProvider.currentUserId();
            String desc = "Removed membership: user=" + userId;
            jdbc.update("INSERT INTO audit_log (log_id, org_id, user_id, activity_type, entity_affected, action_description) VALUES (gen_random_uuid(), ?, ?, ?, ?, ?)",
                    new Object[]{ orgId, actor, "MEMBERSHIP_REMOVE", "org_membership", desc });
        } catch (Exception ignored) {}
    }


    /* ---------------- helpers ---------------- */

    /**
     * Helper method: Checks if the roleName is one of the high-level roles.
     */
    private boolean isHighLevelRole(String roleName) {
        return "ADMIN".equalsIgnoreCase(roleName) ||
                "SYSTEM_ADMIN".equalsIgnoreCase(roleName) ||
                "NEC_ADMIN".equalsIgnoreCase(roleName) ||
                "PARTY_ADMIN".equalsIgnoreCase(roleName);
    }


    private boolean callerIsPlatformAdmin() {
        UUID me = currentUserProvider.currentUserId();
        if (me == null) return false;
        return users.findById(me).map(SystemUser::isSystemAdmin).orElse(false);
    }



    private UUID requireTenant() {
        TenantContext ctx = TenantContext.get();
        UUID orgId = (ctx != null && ctx.orgId().isPresent()) ? ctx.orgId().get() : null;
        if (orgId == null) throw new IllegalStateException("X-Org-Id is required");
        return orgId;
    }


}
