//package election.ems_backend.controller;
//
//
//import election.ems_backend.dto.AdminResetPasswordRequest;
//import election.ems_backend.dto.UserCreateRequest;
//import election.ems_backend.dto.UserDto;
//import election.ems_backend.dto.UserUpdateRequest;
//import election.ems_backend.enums.RoleName;
//import election.ems_backend.security.AuthorizationService;
//import election.ems_backend.service.OrgMembershipService;
//import election.ems_backend.service.SystemUserService;
//import election.ems_backend.utility.AssignCountyRoleRequest;
//import election.ems_backend.utility.ChangePasswordRequest;
//import election.ems_backend.utility.UserSearchRequest;
//import jakarta.validation.Valid;
//import jakarta.validation.constraints.NotNull;
//import lombok.RequiredArgsConstructor;
//import org.springframework.data.domain.Page;
//import org.springframework.data.domain.Pageable;
//import org.springframework.data.web.PageableDefault;
//import org.springframework.format.annotation.DateTimeFormat;
//import org.springframework.http.HttpStatus;
//import org.springframework.http.ResponseEntity;
//import org.springframework.security.core.Authentication;
//import org.springframework.security.oauth2.jwt.Jwt;
//import org.springframework.validation.annotation.Validated;
//import org.springframework.web.bind.annotation.*;
//
//import java.time.LocalDateTime;
//import java.util.Optional;
//import java.util.UUID;
//
//@RestController
//@RequestMapping("/api/user")
//@RequiredArgsConstructor
//@Validated
//public class UserController {
//
//    private final SystemUserService systemUserService;
//    private final OrgMembershipService orgMembershipService;
//    private final AuthorizationService authz;
//
//
//
//    /* ======================= Core CRUD / Query (Tenant-scoped) ======================= */
//
//    @PostMapping
//    public ResponseEntity<UserDto> createInTenant(@Valid @RequestBody UserCreateRequest req) {
//        authz.requireAnyInTenantOrPlatformAdmin();
//        UserDto dto = systemUserService.createInTenant(req);
//        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
//    }
//
//    @PutMapping("/{userId}")
//    public UserDto updateInTenant(@PathVariable UUID userId, @Valid @RequestBody UserUpdateRequest req) {
//        authz.requireAnyInTenantOrPlatformAdmin();
//        return systemUserService.updateInTenant(userId, req);
//    }
//
//
//    /**
//     * Assign a tenant user to a county and a tenant-scoped role
//     * (e.g., "COORDINATOR" for Nimba County).
//     *
//     * Security:
//     *  - Only tenant ADMIN or platform SYSTEM_ADMIN can call this.
//     *  - Tenant is derived from X-Org-Id / subdomain (TenantContext).
//     */
//    @PatchMapping("/{userId}/assign-county-role")
//    public ResponseEntity<UserDto> assignUserToCountyAndRole(
//            @PathVariable("userId") UUID userId,
//            @RequestBody AssignCountyRoleRequest req
//    ) {
//        UserDto updated = systemUserService.assignUserToCountyAndRole(
//                userId,
//                req.getCountyId(),
//                req.getRoleName()
//        );
//        return ResponseEntity.ok(updated);
//    }
//
//
//    @GetMapping
//    public Page<UserDto> search(
//            @RequestParam(required = false) String q,
//            @RequestParam(required = false) Boolean active,
//            @PageableDefault(size = 20, sort = "dateCreated") Pageable pageable
//    ) {
//        UserSearchRequest req = new UserSearchRequest(q, active, null, null, null);
//        return systemUserService.searchInTenant(req, pageable);
//    }
//
//    // UserController.java
//    @GetMapping("/platform")
//    public Page<UserDto> searchPlatform(
//            @RequestParam(required = false) String q,
//            @RequestParam(required = false) Boolean active,
//            @PageableDefault(size = 20, sort = "dateCreated") Pageable pageable
//    ) {
//        authz.requirePlatformAdmin();
//        UserSearchRequest req = new UserSearchRequest(q, active, null, null, null);
//        return systemUserService.searchPlatform(req, pageable);
//    }
//
//
//
//    /* ======================= Status Flags ======================= */
//
//    @PatchMapping("/{userId}/active")
//    @ResponseStatus(HttpStatus.NO_CONTENT)
//    public void setActive(@PathVariable UUID userId, @RequestBody @Valid SetBooleanRequest body) {
//        authz.requireAnyInTenantOrPlatformAdmin();
//        systemUserService.setActiveInTenant(userId, body.value());
//    }
//
//    @PatchMapping("/{id}/verified")
//    @ResponseStatus(HttpStatus.NO_CONTENT)
//    public void setVerified(@PathVariable UUID id, @RequestBody @Valid SetBooleanRequest body) {
//        authz.requireAnyInTenantOrPlatformAdmin();
//        systemUserService.setVerifiedInTenant(id, body.value());
//    }
//
//    /* ======================= Credentials & Security ======================= */
//
//    @PostMapping("/{userId}/password")
//    @ResponseStatus(HttpStatus.NO_CONTENT)
//    public void changePassword(@PathVariable UUID userId, @Valid @RequestBody ChangePasswordRequest req) {
////        authz.requireAny("PARTY_ADMIN", "ADMIN", "SYSTEM_ADMIN");
//        systemUserService.changePassword(userId, req);
//    }
//
//    @PostMapping("/{userId}/password/reset")
//    @ResponseStatus(HttpStatus.NO_CONTENT)
//    public void adminResetPassword(
//            @PathVariable UUID userId,
//            @RequestBody @Valid AdminResetPasswordRequest body) {
//
//        systemUserService.adminResetPasswordInTenant(
//                userId,
//                body.newPassword(),
//                Boolean.TRUE.equals(body.sendEmail())
//        );
//    }
//
//
//
//    @PatchMapping("/{userId}/lock")
//    @ResponseStatus(HttpStatus.NO_CONTENT)
//    public void setLock(@PathVariable UUID userId, @Valid @RequestBody SetLockRequest body) {
//        authz.requireAny("PARTY_ADMIN", "ADMIN", "SYSTEM_ADMIN");
//        systemUserService.setLockInTenant(userId, body.lock(), body.until());
//    }
//
//    @PostMapping("/{id}/login-failure")
//    @ResponseStatus(HttpStatus.NO_CONTENT)
//    public void recordLoginFailure(@PathVariable UUID id) {
//        systemUserService.recordLoginFailure(id);
//    }
//
//    @PostMapping("/{id}/login-success")
//    @ResponseStatus(HttpStatus.NO_CONTENT)
//    public void recordLoginSuccess(@PathVariable UUID id) {
//        systemUserService.recordLoginSuccess(id);
//    }
//
//    /* ======================= Role & Affiliations ======================= */
//
//    @PatchMapping("/{userId}/role")
//    @ResponseStatus(HttpStatus.NO_CONTENT)
//    public void assignRole(@PathVariable UUID userId, @RequestBody @Valid AssignRoleRequest body) {
//        authz.requireAny("PARTY_ADMIN", "ADMIN", "SYSTEM_ADMIN");
//        systemUserService.assignRoleInTenant(userId, body.roleName());
//    }
//
//    @PatchMapping("/{id}/party")
//    @ResponseStatus(HttpStatus.NO_CONTENT)
//    public void assignParty(@PathVariable UUID id, @RequestBody AssignIdRequest body) {
//        authz.requireAny("PARTY_ADMIN", "ADMIN", "SYSTEM_ADMIN");
//        systemUserService.assignPartyInTenant(id, body == null ? null : body.id());
//    }
//
//    @PatchMapping("/{id}/county")
//    @ResponseStatus(HttpStatus.NO_CONTENT)
//    public void assignCounty(@PathVariable UUID id, @RequestBody AssignIdRequest body) {
//        systemUserService.assignCountyInTenant(id, body == null ? null : body.id());
//    }
//
//    @PatchMapping("/{id}/default-org")
//    @ResponseStatus(HttpStatus.NO_CONTENT)
//    public void setDefaultOrg(@PathVariable UUID id, @RequestBody AssignIdRequest body) {
//        systemUserService.setDefaultOrgInTenant(id, body == null ? null : body.id());
//    }
//
//    @GetMapping("/{id}")
//    public ResponseEntity<UserDto> get(@PathVariable UUID id) {
//        Optional<UserDto> user = systemUserService.getInTenant(id);
//        return user.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
//    }
//
//
//
//
//    // ----------------- Add this method -----------------
//    /**
//     * Return the current authenticated user.
//     *
//     * - Tenant mode: requires X-Org-Id (membership-scoped lookup)
//     * - System mode: X-Org-Id optional, but ONLY SYSTEM_ADMIN allowed (platform lookup)
//     */
//    @GetMapping("/me")
//    public ResponseEntity<UserDto> getCurrentUser(
//            @RequestHeader(name = "X-Org-Id", required = false) UUID orgId,
//            Authentication authentication
//    ) {
//        if (authentication == null || !authentication.isAuthenticated()) {
//            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
//        }
//
//        // 1) resolve userId from JWT (preferred) or from auth name
//        UUID userId = null;
//        Object principal = authentication.getPrincipal();
//
//        if (principal instanceof Jwt jwt) {
//            Object claim = jwt.getClaim("userId");
//            if (claim == null) claim = jwt.getClaim("user_id");
//            if (claim == null) claim = jwt.getClaim("id");
//            if (claim == null) claim = jwt.getSubject();
//
//            if (claim instanceof String s) {
//                try { userId = UUID.fromString(s); } catch (IllegalArgumentException ignored) {}
//            }
//        }
//
//        // 2) detect SYSTEM_ADMIN from token authorities / claims
//        boolean isSystemAdmin =
//                authentication.getAuthorities().stream().anyMatch(a ->
//                        a.getAuthority() != null && a.getAuthority().equalsIgnoreCase("ROLE_SYSTEM_ADMIN")
//                );
//
//        // (optional) also trust TokenService claim: isSystemAdmin=true if you want:
//        if (!isSystemAdmin && principal instanceof Jwt jwt) {
//            Object flag = jwt.getClaim("isSystemAdmin");
//            if (flag instanceof Boolean b && b) isSystemAdmin = true;
//        }
//
//        // 3) TENANT MODE (orgId present): membership-scoped lookup
//        if (orgId != null) {
//            if (userId != null) {
//                return systemUserService.getInTenant(userId, orgId)
//                        .map(ResponseEntity::ok)
//                        .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
//            }
//
//            String username = authentication.getName();
//            return systemUserService.getByUsernameInTenant(username, orgId)
//                    .map(ResponseEntity::ok)
//                    .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
//        }
//
//        // 4) PLATFORM MODE (orgId missing): ONLY SYSTEM_ADMIN is allowed
//        if (!isSystemAdmin) {
//            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
//                    .body(null); // or return a structured error: "X-Org-Id header is required"
//        }
//
//        if (userId != null) {
//            return systemUserService.getPlatformUser(userId)
//                    .map(ResponseEntity::ok)
//                    .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
//        }
//
//        return systemUserService.getPlatformUserByUsername(authentication.getName())
//                .map(ResponseEntity::ok)
//                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
//    }
//
//
//    /* ======================= Small request bodies ======================= */
//
//    public record SetBooleanRequest(@NotNull Boolean value) {}
//
//    public record SetLockRequest(
//            @NotNull Boolean lock,
//            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime until // optional when lock=false
//    ) {}
//
//    public record AssignRoleRequest(@NotNull RoleName roleName) {}
//
//    /** Pass {"id":"<uuid>"} or {} / null to clear (for party/county/default-org). */
//    public record AssignIdRequest(UUID id) {}
//
//
//
//}
