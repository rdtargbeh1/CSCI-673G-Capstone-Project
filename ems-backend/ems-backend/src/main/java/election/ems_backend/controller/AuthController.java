
package election.ems_backend.controller;



import election.ems_backend.entity.Organization;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.security.TokenService;
import election.ems_backend.service.AuditLogService;
import election.ems_backend.service.implement.UserSessionService;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authManager;
    private final TokenService tokenService;
    private final SystemUserRepository systemUserRepository;
    private final AuditLogService auditLogService;

    // ✅ NEW: session service
    private final UserSessionService userSessionService;

    public record LoginRequest(String userName, String password) { }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest req) {

        if (req.userName() != null && "SYSTEM".equalsIgnoreCase(req.userName().trim())) {
            auditLogService.logFailedLogin(null, null, "AUTH",
                    "Login blocked: SYSTEM service account cannot login");
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "SYSTEM account cannot be used for login.");
        }

        try {
            Authentication auth = authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.userName(), req.password())
            );
            SecurityContextHolder.getContext().setAuthentication(auth);

            String identifier = auth.getName();
            SystemUser user = systemUserRepository.findByUserNameIgnoreCase(identifier)
                    .or(() -> systemUserRepository.findByEmailIgnoreCase(identifier))
                    .orElseThrow(() -> new IllegalStateException(
                            "User not found after successful authentication: " + identifier
                    ));

            Organization defaultOrg = user.getDefaultOrg();
            UUID orgId = (defaultOrg != null ? defaultOrg.getOrgId() : null);

            String roleName = user.getRole() != null ? user.getRole().getRoleName().name() : null;
            boolean isPlatformUser = "SYSTEM_ADMIN".equals(roleName) || "ADMIN".equals(roleName);
            boolean isSystemAdmin = "SYSTEM_ADMIN".equals(roleName);

            if (!user.isActive()) {
                auditLogService.logFailedLogin(orgId, user.getUserId(), "AUTH",
                        "Login blocked: user account is deactivated");
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Your account has been deactivated. Please contact your organization administrator.");
            }

            if (!isPlatformUser) {
                if (defaultOrg == null) {
                    auditLogService.logFailedLogin(null, user.getUserId(), "AUTH",
                            "Login blocked: no default organization");
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                            "No organization assigned. Please contact your administrator.");
                }
                if (!defaultOrg.isActive()) {
                    auditLogService.logFailedLogin(orgId, user.getUserId(), "AUTH",
                            "Login blocked: organization is deactivated (" + defaultOrg.getOrgName() + ")");
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                            "Your organization has been deactivated. Please contact your administrator.");
                }
            }

            // ✅ Create session row first
            LocalDateTime expiresAt = LocalDateTime.now().plusSeconds(tokenService.expiresInSeconds());
            UUID sessionId = userSessionService.createLoginSession(user.getUserId(), orgId, expiresAt);

            // ✅ Mint token WITH sid
            String jwt = tokenService.mintAccessToken(auth, sessionId);

            // ✅ FIXED: Reset login attempt counters on successful login
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
            user.setLastLogin(LocalDateTime.now());
            systemUserRepository.save(user);

            String defaultOrgName = (defaultOrg != null ? defaultOrg.getOrgName() : null);

            String defaultOrgType = null;
            if (defaultOrg != null) {
                Object t = defaultOrg.getOrganizationType();
                defaultOrgType = (t == null ? null : String.valueOf(t));
            }

            auditLogService.logLogin(orgId, user.getUserId(), "AUTH",
                    "User logged in successfully (sid=" + sessionId + ")");

            return ResponseEntity.ok(
                    new AuthResponse(
                            jwt,
                            tokenService.expiresInSeconds(),
                            orgId,
                            defaultOrgName,
                            defaultOrgType,
                            isSystemAdmin
                    )
            );
        } catch (BadCredentialsException | UsernameNotFoundException ex) {
            // ✅ FIXED: Increment failed login attempts on wrong password/username
            String identifier = req.userName();

            // Try to find user by username or email
            var userOpt = systemUserRepository.findByUserNameIgnoreCase(identifier)
                    .or(() -> systemUserRepository.findByEmailIgnoreCase(identifier));

            if (userOpt.isPresent()) {
                SystemUser user = userOpt.get();
                UUID orgId = (user.getDefaultOrg() != null ? user.getDefaultOrg().getOrgId() : null);

                // Increment failed attempts
                int failedAttempts = user.getFailedLoginAttempts() + 1;
                user.setFailedLoginAttempts(failedAttempts);

                // Lock account after 5 failed attempts (configurable)
                if (failedAttempts >= 5) {
                    LocalDateTime lockUntil = LocalDateTime.now().plusMinutes(30); // Lock for 30 mins
                    user.setLockedUntil(lockUntil);
                    auditLogService.logFailedLogin(orgId, user.getUserId(), "AUTH",
                            "Account locked after 5 failed login attempts");
                } else {
                    auditLogService.logFailedLogin(orgId, user.getUserId(), "AUTH",
                            "Failed login attempt (" + failedAttempts + "/5)");
                }

                systemUserRepository.save(user);
            } else {
                auditLogService.logFailedLogin(null, null, "AUTH",
                        "Failed login attempt for unknown user: " + identifier);
            }

            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password");
        }
    }

//    @PostMapping("/login")
//    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest req) {
//
//        if (req.userName() != null && "SYSTEM".equalsIgnoreCase(req.userName().trim())) {
//            auditLogService.logFailedLogin(null, null, "AUTH",
//                    "Login blocked: SYSTEM service account cannot login");
//            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
//                    "SYSTEM account cannot be used for login.");
//        }
//
//        Authentication auth = authManager.authenticate(
//                new UsernamePasswordAuthenticationToken(req.userName(), req.password())
//        );
//        SecurityContextHolder.getContext().setAuthentication(auth);
//
//        String identifier = auth.getName();
//        SystemUser user = systemUserRepository.findByUserNameIgnoreCase(identifier)
//                .or(() -> systemUserRepository.findByEmailIgnoreCase(identifier))
//                .orElseThrow(() -> new IllegalStateException(
//                        "User not found after successful authentication: " + identifier
//                ));
//
//        Organization defaultOrg = user.getDefaultOrg();
//        UUID orgId = (defaultOrg != null ? defaultOrg.getOrgId() : null);
//
//        // ✅ FIXED: Check if user is a PLATFORM-level user (SYSTEM_ADMIN or ADMIN)
//        String roleName = user.getRole() != null ? user.getRole().getRoleName().name() : null;
//        boolean isPlatformUser = "SYSTEM_ADMIN".equals(roleName) || "ADMIN".equals(roleName);
//        boolean isSystemAdmin = "SYSTEM_ADMIN".equals(roleName);
//
//        if (!user.isActive()) {
//            auditLogService.logFailedLogin(orgId, user.getUserId(), "AUTH",
//                    "Login blocked: user account is deactivated");
//            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
//                    "Your account has been deactivated. Please contact your organization administrator.");
//        }
//
//        // ✅ FIXED: Only require organization for non-platform users
//        // Platform users (SYSTEM_ADMIN, ADMIN) don't need default_org_id
//        // Tenant users (NEC_ADMIN, TENANT_ADMIN, AGENT, etc.) need default_org_id
//        if (!isPlatformUser) {
//            if (defaultOrg == null) {
//                auditLogService.logFailedLogin(null, user.getUserId(), "AUTH",
//                        "Login blocked: no default organization");
//                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
//                        "No organization assigned. Please contact your administrator.");
//            }
//            if (!defaultOrg.isActive()) {
//                auditLogService.logFailedLogin(orgId, user.getUserId(), "AUTH",
//                        "Login blocked: organization is deactivated (" + defaultOrg.getOrgName() + ")");
//                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
//                        "Your organization has been deactivated. Please contact your administrator.");
//            }
//        }
//
//        // ✅ Create session row first
//        LocalDateTime expiresAt = LocalDateTime.now().plusSeconds(tokenService.expiresInSeconds());
//        UUID sessionId = userSessionService.createLoginSession(user.getUserId(), orgId, expiresAt);
//
//        // ✅ Mint token WITH sid
//        String jwt = tokenService.mintAccessToken(auth, sessionId);
//
//        String defaultOrgName = (defaultOrg != null ? defaultOrg.getOrgName() : null);
//
//        String defaultOrgType = null;
//        if (defaultOrg != null) {
//            Object t = defaultOrg.getOrganizationType();
//            defaultOrgType = (t == null ? null : String.valueOf(t));
//        }
//
//        auditLogService.logLogin(orgId, user.getUserId(), "AUTH",
//                "User logged in successfully (sid=" + sessionId + ")");
//
//        return ResponseEntity.ok(
//                new AuthResponse(
//                        jwt,
//                        tokenService.expiresInSeconds(),
//                        orgId,
//                        defaultOrgName,
//                        defaultOrgType,
//                        isSystemAdmin
//                )
//        );
//    }

    /**
     * ✅ Logout revokes CURRENT session using sid claim
     */
    // AuthController.java
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(Authentication authentication) {
        if (!(authentication instanceof JwtAuthenticationToken jwtAuth)) {
            return ResponseEntity.noContent().build();
        }

        var jwt = jwtAuth.getToken();
        Object sidObj = jwt.getClaims().get("sid");
        String sid = sidObj == null ? null : String.valueOf(sidObj);

        if (sid != null && !sid.isBlank()) {
            userSessionService.revoke(UUID.fromString(sid));
        }

        return ResponseEntity.noContent().build();
    }


    @Getter
    @AllArgsConstructor
    static class AuthResponse {
        private String accessToken;
        private long expiresIn;
        private UUID defaultOrgId;
        private String defaultOrgName;
        private String defaultOrgType;
        private boolean isSystemAdmin;
    }


}

