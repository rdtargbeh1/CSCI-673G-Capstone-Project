package election.ems_backend.controller;

import election.ems_backend.entity.Organization;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.security.TokenService;
import election.ems_backend.service.AuditLogService;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authManager;
    private final TokenService tokenService;
    private final SystemUserRepository systemUserRepository;
    private final AuditLogService auditLogService;

    public record LoginRequest(String userName, String password) { }


    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest req) {

        // 1) Authenticate credentials
        Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.userName(), req.password())
        );
        SecurityContextHolder.getContext().setAuthentication(auth);

        // 2) Resolve the real user record (username OR email, case-insensitive)
        String identifier = auth.getName();
        SystemUser user = systemUserRepository.findByUserNameIgnoreCase(identifier)
                .or(() -> systemUserRepository.findByEmailIgnoreCase(identifier))
                .orElseThrow(() -> new IllegalStateException(
                        "User not found after successful authentication: " + identifier
                ));

        // 3) Resolve default org (if any)
        Organization defaultOrg = user.getDefaultOrg();
        UUID orgId = (defaultOrg != null ? defaultOrg.getOrgId() : null);

        // 4) Determine if SYSTEM_ADMIN (allowed to login without org)
        boolean isSystemAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_SYSTEM_ADMIN".equals(a.getAuthority()));

        // ✅ A) Block deactivated user
        if (!user.isActive()) {
            auditLogService.logFailedLogin(
                    orgId,
                    user.getUserId(),
                    "AUTH",
                    "Login blocked: user account is deactivated"
            );
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Your account has been deactivated. Please contact your organization administrator."
            );
        }

        // ✅ B) Enforce tenant rule (non-system-admin must have active org)
        if (!isSystemAdmin) {

            // No default org assigned
            if (defaultOrg == null) {
                auditLogService.logFailedLogin(
                        null,
                        user.getUserId(),
                        "AUTH",
                        "Login blocked: no default organization"
                );
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "No organization assigned. Please contact your administrator."
                );
            }

            // Org is deactivated
            if (!defaultOrg.isActive()) {
                auditLogService.logFailedLogin(
                        orgId,
                        user.getUserId(),
                        "AUTH",
                        "Login blocked: organization is deactivated (" + defaultOrg.getOrgName() + ")"
                );
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Your organization has been deactivated. Please contact your administrator."
                );
            }
        }

        // ✅ 5) Mint JWT only after checks pass
        String jwt = tokenService.mintAccessToken(auth);

        UUID defaultOrgId = (defaultOrg != null ? defaultOrg.getOrgId() : null);
        String defaultOrgName = (defaultOrg != null ? defaultOrg.getOrgName() : null);

        // ✅ NEW: include org type so frontend can select dashboard mode immediately
        String defaultOrgType = null;
        if (defaultOrg != null) {
            // adjust getter if your Organization uses a different field name
            Object t = defaultOrg.getOrganizationType();
            defaultOrgType = (t == null ? null : String.valueOf(t));
        }

        // ✅ 6) Audit successful login
        auditLogService.logLogin(
                defaultOrgId,
                user.getUserId(),
                "AUTH",
                "User logged in successfully"
        );

        return ResponseEntity.ok(
                new AuthResponse(
                        jwt,
                        tokenService.expiresInSeconds(),
                        defaultOrgId,
                        defaultOrgName,
                        defaultOrgType,
                        isSystemAdmin
                )
        );
    }

    @Getter
    @AllArgsConstructor
    static class AuthResponse {
        private String accessToken;
        private long expiresIn;
        private UUID defaultOrgId;
        private String defaultOrgName;

        // ✅ NEW
        private String defaultOrgType; // "NEC" | "POLITICAL_PARTY" | "MEDIA" | etc.
        private boolean isSystemAdmin;
    }


}
