package election.ems_backend.admin_control;


import election.ems_backend.dto.UserCreateRequest;
import election.ems_backend.dto.UserDto;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.service.SystemUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;


@RestController
@RequestMapping("/api/tenants/users")
@RequiredArgsConstructor
public class TenantUserController {

    private final AuthorizationService authz;
    private final SystemUserService systemUserService;


    /**
     * Create a tenant admin for the current org (from TenantContext).
     *
     * Allowed roles (enforced in service):
     *   ADMIN or PARTY_ADMIN
     *
     * Caller:
     *   SYSTEM_ADMIN (platform admin) – must send X-Org-Id for the target org.
     *
     * Usage:
     *   - SYSTEM_ADMIN sets X-Org-Id=<orgId> and roleName=PARTY_ADMIN to create the first PARTY_ADMIN
     *     for that organization.
     */
    @PostMapping("/admins")
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto createTenantAdmin(@RequestBody @Valid UserCreateRequest req) {
        // Platform-level check: does NOT depend on tenant membership
        authz.requirePlatformAdmin();
        return systemUserService.createTenantAdmin(req);
    }



    /**
     * Create a tenant member in the current org (from TenantContext).
     *
     * Allowed roles (enforced in service):
     *   AGENT, SUPERVISOR, DATA_ENTRY, OBSERVER, COORDINATOR, AUDITOR
     *
     * Caller:
     *   PARTY_ADMIN, ADMIN, or SYSTEM_ADMIN in this tenant.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto createMember(@RequestBody @Valid UserCreateRequest req) {
//        authz.requireAnyInTenantOrPlatformAdmin();
        authz.requireAny("TENANT_ADMIN", "ADMIN");  // Caller must be a tenant PARTY_ADMIN, ADMIN, or platform SYSTEM_ADMIN
        return systemUserService.createTenantMemberRestricted(req);
    }





}
