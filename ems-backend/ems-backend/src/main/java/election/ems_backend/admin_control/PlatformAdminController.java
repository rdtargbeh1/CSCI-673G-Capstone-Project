package election.ems_backend.admin_control;

import election.ems_backend.dto.AdminResetPasswordRequest;
import election.ems_backend.dto.UserCreateRequest;
import election.ems_backend.dto.UserDto;
import election.ems_backend.dto.UserUpdateRequest;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.security.AuthorizationService;

import election.ems_backend.service.OrganizationService;
import election.ems_backend.service.PartyService;
import election.ems_backend.service.SystemUserService;
import election.ems_backend.utility.ChangePasswordRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestController
@RequestMapping("/api/platform")
@RequiredArgsConstructor
public class PlatformAdminController {


    private final AuthorizationService authz;
    private final OrganizationService organizationService;
    private final SystemUserService systemUserService;
    private final SystemUserRepository systemUserRepository;
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
     * ✅ Platform user self-change password
     */
    @PostMapping("/system-users/{userId}/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePasswordPlatform(
            @PathVariable UUID userId,
            @RequestBody @Valid ChangePasswordRequest body
    ) {

        systemUserService.changePasswordPlatform(userId, body);
    }

    /**
     * SYSTEM ADMIN password reset for platform users
     */
    @PostMapping("/system-users/{userId}/password/reset")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void adminResetPlatformPassword(
            @PathVariable UUID userId,
            @RequestBody @Valid AdminResetPasswordRequest body
    ) {

        authz.requirePlatformAdmin();

        systemUserService.adminResetPasswordPlatform(
                userId,
                body.newPassword(),
                Boolean.TRUE.equals(body.sendEmail())
        );
    }


    @PatchMapping("/organizations/{orgId}/status")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setOrganizationActive(
            @PathVariable UUID orgId,
            @RequestParam boolean active) {

        authz.requirePlatformAdmin();
        organizationService.setActive(orgId, active);
    }




}