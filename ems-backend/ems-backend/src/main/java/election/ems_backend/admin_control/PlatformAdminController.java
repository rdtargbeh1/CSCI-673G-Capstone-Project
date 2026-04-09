package election.ems_backend.admin_control;

import election.ems_backend.dto.UserCreateRequest;
import election.ems_backend.dto.UserDto;
import election.ems_backend.dto.UserUpdateRequest;
import election.ems_backend.security.AuthorizationService;

import election.ems_backend.service.OrganizationService;
import election.ems_backend.service.PartyService;
import election.ems_backend.service.SystemUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/platform")
@RequiredArgsConstructor
public class PlatformAdminController {


    private final AuthorizationService authz;
    private final OrganizationService organizationService;
    private final SystemUserService systemUserService;
    private final PartyService partyService;




    /**
     * Create a global/system user (not bound to a specific org).
     *
     * - If req.roleName = SYSTEM_ADMIN → user.systemAdmin = true (platform owner).
     * - Other roles → global users, systemAdmin = false.
     */
    @PostMapping("/system-users")
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto createSystemUser(@RequestBody @Valid UserCreateRequest req) {
        authz.requirePlatformAdmin();
//        authz.requireAny("SYSTEM_ADMIN");
        return systemUserService.createPlatformAdmin(req);
    }

    @PutMapping("/system-users/{userId}")
    public UserDto updatePlatformSystemUser(
            @PathVariable UUID userId,
            @RequestBody @Valid UserUpdateRequest req
    ) {
        authz.requirePlatformAdmin();
        return systemUserService.updatePlatformUser(userId, req);
    }


    // ✅ Activate/deactivate platform user
    @PatchMapping("/system-users/{userId}/active")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setPlatformUserActive(@PathVariable UUID userId,
                                      @RequestParam boolean value) {
        authz.requirePlatformAdmin();
        systemUserService.setActivePlatform(userId, value);
    }

    // ✅ Verify/unverify platform user
    @PatchMapping("/system-users/{userId}/verified")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setPlatformUserVerified(@PathVariable UUID userId,
                                        @RequestParam boolean value) {
        authz.requirePlatformAdmin();
        systemUserService.setVerifiedPlatform(userId, value);
    }


    /**
     * Activate or deactivate an organization (tenant).
     *
     * <p>This endpoint allows a platform-level SYSTEM_ADMIN to enable or disable
     * a tenant. When an organization is deactivated:
     *
     * <ul>
     *   <li>The organization's <code>is_active</code> flag is set to <code>false</code>.</li>
     *   <li>All org_membership records under this tenant are disabled (recommended safety measure).</li>
     *   <li>User sessions for this tenant may also be revoked (if implemented in the service).</li>
     * </ul>
     *
     * <p>Deactivation does <strong>NOT</strong> delete the organization or its data.
     * It simply freezes the tenant so that:
     *
     * <ul>
     *   <li>No one can log in under that organization.</li>
     *   <li>No votes, reports, submissions, messages, or uploads can be created.</li>
     *   <li>Existing data is preserved for audits and later reactivation.</li>
     * </ul>
     *
     * <h3>Authorization:</h3>
     * Only platform-level <strong>SYSTEM_ADMIN</strong> users may call this endpoint.
     *
     * <h3>Example Request:</h3>
     *
     * <pre>
     * PATCH /api/platform/organizations/00089918-4d00-42f3-9e40-3319c4cbb93c/status?active=false
     * </pre>
     *
     * <h3>Query Parameters:</h3>
     * <ul>
     *   <li><strong>active</strong> — <code>true</code> to activate, <code>false</code> to deactivate.</li>
     * </ul>
     *
     * <h3>Responses:</h3>
     * <ul>
     *   <li><strong>204 NO CONTENT</strong> — Operation successful.</li>
     *   <li><strong>403 FORBIDDEN</strong> — Caller is not SYSTEM_ADMIN.</li>
     *   <li><strong>404 NOT FOUND</strong> — Organization does not exist.</li>
     * </ul>
     */
    @PatchMapping("/organizations/{orgId}/status")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setOrganizationActive(
            @PathVariable UUID orgId,
            @RequestParam boolean active) {

        authz.requirePlatformAdmin();
        organizationService.setActive(orgId, active);
    }



}