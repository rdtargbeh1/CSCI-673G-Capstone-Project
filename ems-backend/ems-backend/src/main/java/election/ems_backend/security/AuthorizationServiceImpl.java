package election.ems_backend.security;

import election.ems_backend.entity.OrgMembership;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.repository.OrgMembershipRepository;
import election.ems_backend.repository.OrganizationRepository;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Production implementation:
 *  - Reads the current tenant from TenantContext (populated by TenantFilter)
 *  - Reads current user id from CurrentUserProvider (SecurityContext/JWT)
 *  - Verifies membership is enabled for this tenant
 *  - Performs role checks (case-insensitive, ROLE_ prefix tolerant)
 *
 * Bean name is "authz" so you can use it from SpEL:
 *   @PreAuthorize("@authz.hasAny('ADMIN','MODERATOR')")
 */
@Service("authz")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthorizationServiceImpl implements AuthorizationService {

    // ✅ Make injection consistent: constructor injection via @RequiredArgsConstructor
    private final OrgMembershipRepository memberships;
    private final CurrentUserProvider currentUser;
    private final SystemUserRepository systemUserRepository;
    private final OrganizationRepository organizationRepository;


    @Override
    public OrgMembership requireMembership() {
        TenantContext ctx = TenantContext.get();
        if (ctx == null) {
            throw new AccessDeniedException("Tenant context missing");
        }

        // 1) Platform SYSTEM_ADMIN: synthetic membership (no real org_membership row required)
        if (ctx.isSystemAdmin()) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken || !isPlatformAdmin(auth)) {
                throw new AccessDeniedException("Authentication required");
            }
            return OrgMembership.systemAdmin(ctx.userId().orElse(null), ctx.orgId().orElse(null));
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
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
                throw new AccessDeniedException("Authentication required");
            }

            String identifier = null;

            Object principal = auth.getPrincipal();
            if (principal instanceof org.springframework.security.core.userdetails.UserDetails ud) {
                identifier = ud.getUsername();
            } else if (principal instanceof Jwt jwt) {
                Object u = jwt.getClaims().get("userName");
                if (u instanceof String s && !s.isBlank()) {
                    identifier = s;
                } else {
                    Object email = jwt.getClaims().get("email");
                    if (email instanceof String s && !s.isBlank()) {
                        identifier = s;
                    } else {
                        identifier = auth.getName();
                    }
                }
            } else {
                identifier = auth.getName();
            }

            if (identifier == null || identifier.isBlank()) {
                throw new AccessDeniedException("Authentication required");
            }

            final String idFinal = identifier;

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

        String have = normalizeRoleToken(m.getRoleName());
        for (String want : roleNames) {
            if (want == null) continue;
            if (normalizeRoleToken(want).equals(have)) return m;
        }

        // ✅ avoid leaking the full role list in error messages
        throw new AccessDeniedException("Insufficient role");
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
            return m.isSystemAdmin() ? Set.of("SYSTEM_ADMIN") : Set.of(normalizeRoleToken(m.getRoleName()));
        } catch (AccessDeniedException e) {
            return Set.of();
        }
    }

    @Override
    public void requirePlatformAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            throw new AuthenticationCredentialsNotFoundException("Authentication required");
        }

        if (!isPlatformAdmin(auth)) {
            throw new AccessDeniedException("Platform admin required");
        }
    }

    @Override
    public void requireAnyInTenantOrPlatformAdmin(String... roleNames) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)) {
            if (isPlatformAdmin(auth)) return; // ✅ single source of truth
        }

        // Not platform admin — fall back to tenant-scoped check which validates membership.
        requireAny(roleNames);
    }

    @Override
    public OrgMembership requireNecAdminOrPlatformAdmin() {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        // ✅ 1) SYSTEM_ADMIN (global override) — no tenant required
        if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)) {
            if (isPlatformAdmin(auth)) {
                TenantContext ctx = TenantContext.get();
                UUID userId = (ctx != null ? ctx.userId().orElse(null) : null);
                UUID orgId  = (ctx != null ? ctx.orgId().orElse(null) : null);
                return OrgMembership.systemAdmin(userId, orgId);
            }
        }

        // ✅ 2) Otherwise: require NEC_ADMIN membership (tenant-scoped)
        OrgMembership m = requireMembership();

        if (normalizeRoleToken(m.getRoleName()).equals("NEC_ADMIN")) {
            return m;
        }

        throw new AccessDeniedException("NEC Admin or System Admin required");
    }



    // ---------------- private helpers ----------------

    /** Single source of truth: determine platform/system admin from JWT claims or authorities. */
    private boolean isPlatformAdmin(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() ||
                auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken) {
            return false;
        }

        // A) Authorities (EXACT match only; ROLE_ prefix tolerated)
        if (auth.getAuthorities() != null) {
            boolean byAuthorities = auth.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .filter(Objects::nonNull)
                    .map(this::normalizeRoleToken)      // strips ROLE_, uppercases
                    .anyMatch(r -> r.equals("SYSTEM_ADMIN"));

            if (byAuthorities) return true;
        }

        // B) JWT claims (covers your case where authorities list may be empty)
        if (auth instanceof org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken jwtAuth) {
            return isSystemAdminFromJwt(jwtAuth.getToken());
        }
        if (auth.getPrincipal() instanceof org.springframework.security.oauth2.jwt.Jwt jwt) {
            return isSystemAdminFromJwt(jwt);
        }

        return false;
    }


    /**
     * Strict SYSTEM_ADMIN detection from JWT claims.
     * Supports the same claim keys as before, but avoids substring/endsWith bridges.
     */
    private boolean isSystemAdminFromJwt(org.springframework.security.oauth2.jwt.Jwt jwt) {
        if (jwt == null) return false;

        // 1) explicit global role name
        String globalRoleName = asString(jwt.getClaim("globalRoleName"));
        if ("SYSTEM_ADMIN".equalsIgnoreCase(globalRoleName)) return true;

        // 2) explicit boolean/string flag
        Object isFlag = jwt.getClaim("isSystemAdmin");
        if (isFlag instanceof Boolean b && b) return true;
        if (isFlag instanceof String s && Boolean.parseBoolean(s)) return true;

        // 3) exact role tokens in common claim keys
        if (containsRole(jwt.getClaim("roles"), "SYSTEM_ADMIN")) return true;
        if (containsRole(jwt.getClaim("authorities"), "SYSTEM_ADMIN")) return true;
        if (containsRole(jwt.getClaim("permissions"), "SYSTEM_ADMIN")) return true;
        if (containsRole(jwt.getClaim("scope"), "SYSTEM_ADMIN")) return true;
        if (containsRole(jwt.getClaim("scp"), "SYSTEM_ADMIN")) return true;

        // keep compatibility: allow ROLE_SYSTEM_ADMIN as exact token
        if (containsRole(jwt.getClaim("roles"), "ROLE_SYSTEM_ADMIN")) return true;
        if (containsRole(jwt.getClaim("authorities"), "ROLE_SYSTEM_ADMIN")) return true;

        return false;
    }

    private String asString(Object v) {
        return (v == null) ? null : String.valueOf(v);
    }

    /**
     * Checks whether a claim contains the expected role as an EXACT token.
     *
     * Supported claim formats:
     *  - String: "A B C" or "A,B,C"
     *  - Collection: ["A","B","C"]
     *
     * This avoids unsafe substring matches like "NOT_SYSTEM_ADMIN".
     */
    private boolean containsRole(Object claimValue, String expected) {
        if (claimValue == null || expected == null) return false;

        String exp = normalizeRoleToken(expected);

        // claim is a String (common for scope): split into tokens
        if (claimValue instanceof String s) {
            for (String tok : splitTokens(s)) {
                if (normalizeRoleToken(tok).equals(exp)) return true;
            }
            return false;
        }

        // claim is a list/array
        if (claimValue instanceof Collection<?> c) {
            for (Object o : c) {
                if (o == null) continue;
                if (normalizeRoleToken(String.valueOf(o)).equals(exp)) return true;
            }
        }

        return false;
    }

    /**
     * Normalize any role/authority token into a comparable role name:
     * - trim
     * - uppercase
     * - remove ROLE_ prefix
     *
     * Examples:
     *  "ROLE_SYSTEM_ADMIN" -> "SYSTEM_ADMIN"
     *  "system_admin"      -> "SYSTEM_ADMIN"
     */
    private String normalizeRoleToken(String role) {
        if (role == null) return "";
        String r = role.trim().toUpperCase(Locale.ROOT);
        if (r.startsWith("ROLE_")) r = r.substring("ROLE_".length());
        return r;
    }


    /** Split common string role formats: whitespace and commas. */
    private List<String> splitTokens(String s) {
        if (s == null || s.isBlank()) return java.util.List.of();
        return java.util.Arrays.stream(s.split("[,\\s]+"))
                .map(String::trim)
                .filter(t -> !t.isEmpty())
                .toList();
    }


}



