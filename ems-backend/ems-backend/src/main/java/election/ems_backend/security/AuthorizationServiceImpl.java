package election.ems_backend.security;


import election.ems_backend.entity.OrgMembership;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.repository.OrgMembershipRepository;
import election.ems_backend.repository.OrganizationRepository;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.utility.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;


/**
 * Production implementation:
 *  - Reads the current tenant from TenantContext (populated by TenantFilter)
 *  - Reads current user id from CurrentUserProvider (SecurityContext/JWT)
 *  - Verifies membership is enabled for this tenant
 *  - Performs role checks (case-insensitive)
 *
 * Bean name is "authz" so you can use it from SpEL:
 *   @PreAuthorize("@authz.hasAny('ADMIN','MODERATOR')")
 */
@Service("authz")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthorizationServiceImpl implements AuthorizationService {

    @Autowired
    private OrgMembershipRepository memberships;
    @Autowired
    private CurrentUserProvider currentUser;
    @Autowired
    private SystemUserRepository systemUserRepository;
    @Autowired
    private OrganizationRepository organizationRepository;



    @Override
    public OrgMembership requireMembership() {
        TenantContext ctx = TenantContext.get();
        if (ctx == null) {
            throw new AccessDeniedException("Tenant context missing");
        }

        // 1) Platform SYSTEM_ADMIN: synthetic membership (no real org_membership row required)
        if (ctx.isSystemAdmin()) {
            return OrgMembership.systemAdmin(
                    ctx.userId().orElse(null),
                    ctx.orgId().orElse(null)
            );
        }

        // 2) Tenant must be present
        UUID orgId = ctx.orgId()
                .orElseThrow(() -> new AccessDeniedException("Tenant required"));

        // 3) Resolve userId in three steps:
        //    (a) from TenantContext
        //    (b) from CurrentUserProvider
        //    (c) from Authentication (username/email → SystemUser lookup)
        UUID userId = ctx.userId().orElse(null);

        if (userId == null) {
            userId = currentUser.currentUserId();
        }

        if (userId == null) {
            // Fallback: inspect SecurityContext directly
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
                throw new AccessDeniedException("Authentication required");
            }

            // Try to infer identifier (username/email) from Authentication
            String identifier = null;

            Object principal = auth.getPrincipal();
            if (principal instanceof org.springframework.security.core.userdetails.UserDetails ud) {
                identifier = ud.getUsername();
            } else if (principal instanceof Jwt jwt) {
                // Prefer explicit claims if present
                Object u = jwt.getClaims().get("userName");
                if (u instanceof String s && !s.isBlank()) {
                    identifier = s;
                } else {
                    Object email = jwt.getClaims().get("email");
                    if (email instanceof String s && !s.isBlank()) {
                        identifier = s;
                    } else {
                        identifier = auth.getName(); // fallback: subject / name
                    }
                }
            } else {
                identifier = auth.getName();
            }

            if (identifier == null || identifier.isBlank()) {
                throw new AccessDeniedException("Authentication required");
            }

            // Make identifier effectively final for lambdas
            final String idFinal = identifier;

            // Lookup SystemUser by username first, then by email
            SystemUser user = systemUserRepository.findByUserNameIgnoreCase(idFinal)
                    .orElseGet(() ->
                            systemUserRepository.findByEmailIgnoreCase(idFinal)
                                    .orElseThrow(() -> new AccessDeniedException("Authentication required"))
                    );

            userId = user.getUserId();
        }

        // 4) Require an enabled membership for this tenant + user
        return memberships.findByOrganization_OrgIdAndUser_UserIdAndIsEnabledTrue(orgId, userId)
                .orElseThrow(() -> new AccessDeniedException("Not a member of this organization or membership disabled"));
    }


    @Override
    public OrgMembership requireAny(String... roleNames) {
        OrgMembership m = requireMembership();
        if (m.isSystemAdmin()) return m;
        if (roleNames == null || roleNames.length == 0) return m;

        String have = m.getRoleName();
        for (String want : roleNames) {
            if (want != null && want.equalsIgnoreCase(have)) return m;
        }
        throw new AccessDeniedException("Insufficient role: requires any of " + Arrays.toString(roleNames));
    }


    @Override
    public boolean hasAny(String... roleNames) {
        try {
            requireAny(roleNames);
            return true;
        } catch (AccessDeniedException e) {
            return false;
        }
    }

    @Override
    public Set<String> currentRoles() {
        try {
            OrgMembership m = requireMembership();
            return m.isSystemAdmin() ? Set.of("SYSTEM_ADMIN") : Set.of(m.getRoleName());
        } catch (AccessDeniedException e) {
            return Set.of();
        }
    }


    // 🔹 NEW: platform-level admin guard (no tenant required)
    @Override
    public void requirePlatformAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        // 1) Must be authenticated
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required");
        }
        boolean isAdmin = false;

        Object principal = auth.getPrincipal();

        // ---- Case 1: JwtAuthenticationToken (most common with resource server) ----
        if (auth instanceof org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken jwtAuth) {
            Jwt jwt = jwtAuth.getToken();
            // (a) Prefer the JWT claim: isSystemAdmin
            Object claimVal = jwt.getClaims().get("isSystemAdmin");
            if (claimVal instanceof Boolean b) {
                isAdmin = b;
            } else if (claimVal instanceof String s) {
                isAdmin = Boolean.parseBoolean(s);
            }
            // (b) Fallback: check authorities that end with SYSTEM_ADMIN (ROLE_SYSTEM_ADMIN, SYSTEM_ADMIN, etc.)
            if (!isAdmin) {
                isAdmin = jwtAuth.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .anyMatch(a -> a != null && a.toUpperCase().endsWith("SYSTEM_ADMIN"));
            }
        }
        // ---- Case 2: principal itself is a Jwt ----
        else if (principal instanceof Jwt jwt) {
            Object claimVal = jwt.getClaims().get("isSystemAdmin");
            if (claimVal instanceof Boolean b) {
                isAdmin = b;
            } else if (claimVal instanceof String s) {
                isAdmin = Boolean.parseBoolean(s);
            }
            if (!isAdmin) {
                isAdmin = auth.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .anyMatch(a -> a != null && a.toUpperCase().endsWith("SYSTEM_ADMIN"));
            }
        }
        // ---- Case 3: Anything else (local dev, username/password, etc.) ----
        else {
            isAdmin = auth.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .anyMatch(a -> a != null && a.toUpperCase().endsWith("SYSTEM_ADMIN"));
        }
        if (!isAdmin) {
            throw new AccessDeniedException("Platform admin required");
        }
    }


    @Override
    public void requireAnyInTenantOrPlatformAdmin(String... roleNames) {
        // First: if caller is platform/system admin based on authentication, allow immediately.
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)) {
            boolean isSystemAdmin = false;

            // Check JWT claim & authorities
            Object principal = auth.getPrincipal();
            if (auth instanceof org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken jwtAuth) {
                Jwt jwt = jwtAuth.getToken();
                Object claimVal = jwt.getClaims().get("isSystemAdmin");
                if (claimVal instanceof Boolean b) isSystemAdmin = b;
                else if (claimVal instanceof String s) isSystemAdmin = Boolean.parseBoolean(s);

                if (!isSystemAdmin) {
                    isSystemAdmin = jwtAuth.getAuthorities().stream()
                            .map(GrantedAuthority::getAuthority)
                            .anyMatch(a -> a != null && a.toUpperCase().endsWith("SYSTEM_ADMIN"));
                }
            } else {
                if (principal instanceof Jwt jwt) {
                    Object claimVal = jwt.getClaims().get("isSystemAdmin");
                    if (claimVal instanceof Boolean b) isSystemAdmin = b;
                    else if (claimVal instanceof String s) isSystemAdmin = Boolean.parseBoolean(s);
                }

                if (!isSystemAdmin) {
                    isSystemAdmin = auth.getAuthorities().stream()
                            .map(GrantedAuthority::getAuthority)
                            .anyMatch(a -> a != null && a.toUpperCase().endsWith("SYSTEM_ADMIN"));
                }
            }

            if (isSystemAdmin) {
                // platform admin — allow
                return;
            }
        }

        // Not platform admin — fall back to tenant-scoped check which will validate membership.
        requireAny(roleNames);
    }


    @Override
    public OrgMembership requireNecAdminOrPlatformAdmin() {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        // ✅ 1) SYSTEM_ADMIN (global override) — no tenant required
        if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)) {

            // A) If authorities are present (some setups)
            boolean isSystemAdminByAuthorities = auth.getAuthorities() != null
                    && auth.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .filter(Objects::nonNull)
                    .map(String::toUpperCase)
                    .anyMatch(a -> a.endsWith("SYSTEM_ADMIN"));

            // B) If JWT has roles/claims but authorities list is empty (your current logs)
            boolean isSystemAdminByJwt = false;
            if (auth.getPrincipal() instanceof org.springframework.security.oauth2.jwt.Jwt jwt) {
                isSystemAdminByJwt = isSystemAdminFromJwt(jwt);
            }

            // C) If principal is JwtAuthenticationToken (common)
            if (!isSystemAdminByJwt && auth instanceof org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken jwtAuth) {
                isSystemAdminByJwt = isSystemAdminFromJwt(jwtAuth.getToken());
            }

            if (isSystemAdminByAuthorities || isSystemAdminByJwt) {
                TenantContext ctx = TenantContext.get();
                UUID userId = (ctx != null ? ctx.userId().orElse(null) : null);
                UUID orgId  = (ctx != null ? ctx.orgId().orElse(null) : null);
                return OrgMembership.systemAdmin(userId, orgId);
            }
        }

        // ✅ 2) Otherwise: require NEC_ADMIN membership (tenant-scoped)
        OrgMembership m = requireMembership(); // must succeed for tenant-scoped

        if ("NEC_ADMIN".equalsIgnoreCase(m.getRoleName())) {
            return m;
        }

        throw new AccessDeniedException("NEC Admin or System Admin required");
    }

    /**
     * ✅ Robust SYSTEM_ADMIN detection from JWT claims.
     * Adjust claim keys here to match your token.
     */
    private boolean isSystemAdminFromJwt(org.springframework.security.oauth2.jwt.Jwt jwt) {
        if (jwt == null) return false;

        // Most common claim patterns:
        // - globalRoleName: "SYSTEM_ADMIN"
        // - roles: ["SYSTEM_ADMIN", ...]
        // - authorities: ["ROLE_SYSTEM_ADMIN", ...]
        // - scope/scp: "SYSTEM_ADMIN ..." or ["SYSTEM_ADMIN", ...]

        String globalRoleName = asString(jwt.getClaim("globalRoleName"));
        if ("SYSTEM_ADMIN".equalsIgnoreCase(globalRoleName)) return true;

        // sometimes boolean flag
        Boolean isSystemAdminFlag = jwt.getClaim("isSystemAdmin");
        if (Boolean.TRUE.equals(isSystemAdminFlag)) return true;

        // arrays: roles / authorities / permissions
        if (containsRole(jwt.getClaim("roles"), "SYSTEM_ADMIN")) return true;
        if (containsRole(jwt.getClaim("authorities"), "SYSTEM_ADMIN")) return true;
        if (containsRole(jwt.getClaim("permissions"), "SYSTEM_ADMIN")) return true;

        // scopes: "scope" or "scp"
        if (containsRole(jwt.getClaim("scope"), "SYSTEM_ADMIN")) return true;
        if (containsRole(jwt.getClaim("scp"), "SYSTEM_ADMIN")) return true;

        // fallback: check for something like "ROLE_SYSTEM_ADMIN"
        if (containsRole(jwt.getClaim("roles"), "ROLE_SYSTEM_ADMIN")) return true;
        if (containsRole(jwt.getClaim("authorities"), "ROLE_SYSTEM_ADMIN")) return true;

        return false;
    }

    private String asString(Object v) {
        return (v == null) ? null : String.valueOf(v);
    }

    private boolean containsRole(Object claimValue, String expected) {
        if (claimValue == null || expected == null) return false;

        String exp = expected.toUpperCase();

        // Claim is a String like "SYSTEM_ADMIN NEC_ADMIN"
        if (claimValue instanceof String s) {
            String up = s.toUpperCase();
            return up.contains(exp);
        }

        // Claim is a List/array
        if (claimValue instanceof Collection<?> c) {
            for (Object o : c) {
                if (o == null) continue;
                String up = String.valueOf(o).toUpperCase();
                if (up.equals(exp) || up.endsWith(exp)) return true;
            }
        }

        return false;
    }



    /* ---------------- helpers ---------------- */

    private static String safe(String s) {
        return s == null ? "" : s;
    }

    private static boolean equalsIgnoreCaseNonNull(String a, String b) {
        return b != null && a.equalsIgnoreCase(b);
    }
}
