package election.ems_backend.security;


import election.ems_backend.repository.OrganizationRepository;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.tenant.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.jboss.logging.MDC;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.lang.reflect.Method;
import java.util.Map;
import java.util.UUID;


/**
 * Strict tenant resolution and binding for every authenticated request.
 *
 * Rules:
 *  1) Accept tenant via subdomain or "X-Org-Id" header.
 *  2) If BOTH present, they MUST match → 400.
 *  3) Only ACTIVE organizations are accepted → 400 otherwise.
 *  4) isSystemAdmin derived from SecurityContext roles/claims.
 *
 * This filter DOES NOT write to MDC. RequestContextMdcFilter is the single MDC writer.
 *
 * ORDERING (required):
 *   Add this filter to the Spring Security chain AFTER authentication, e.g.:
 *     http.addFilterAfter(tenantFilter, org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationFilter.class);
 *   (or UsernamePasswordAuthenticationFilter for form-login chains)
 */

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
@RequiredArgsConstructor
public class TenantFilter extends OncePerRequestFilter {

    private static final String TENANT_HEADER = "X-Org-Id";
    private final CurrentUserProvider currentUserProvider;
    private final SystemUserRepository systemUserRepository;

    private final ObjectProvider<OrganizationRepository> organizationsProvider;
    private static final Logger log = LoggerFactory.getLogger(TenantFilter.class);


    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String p = request.getRequestURI();
        String m = request.getMethod();
        if ("OPTIONS".equalsIgnoreCase(m)) return true;

        return p.startsWith("/api/public/")
                || p.startsWith("/api/auth/")
                || p.startsWith("/actuator")
                || p.startsWith("/favicon")
                || p.startsWith("/assets")
                || p.startsWith("/static");
    }


    /** Only tenant endpoints should enforce tenant presence. */
    private boolean isTenantScoped(String path) {
        if (path == null) return false;

        // ✅ SYSTEM ADMIN GLOBAL ROUTES: no tenant required
        if (path.startsWith("/api/system/")) return false;

        // ✅ GLOBAL endpoints (no tenant required)
        if (path.startsWith("/api/elections")) return false;     // elections are global
        if (path.startsWith("/api/orgs")) return false;          // orgs are platform-managed
        if (path.startsWith("/api/public/")) return false;
        if (path.startsWith("/api/auth/")) return false;

        // ✅ PLATFORM USER ROUTES (no tenant required)
        // IMPORTANT: these must come BEFORE "/api/users/" rule
        if (path.equals("/api/users/me")) return false;          // system-admin mode supports no org header
        if (path.startsWith("/api/users/platform")) return false; // list/search platform users
        if (path.startsWith("/api/users/bootstrap")) return false; // if you have bootstrap endpoints
        // add more platform-only user endpoints here if needed

        // ✅ Tenant-scoped endpoints (require X-Org-Id or subdomain)
        return path.startsWith("/api/members")
                || path.startsWith("/api/chat/")
                || path.startsWith("/api/votes/")
                || path.startsWith("/api/org-settings")
                || path.startsWith("/api/tenants/")
                || path.startsWith("/api/users/");  // everything else under users is tenant scoped
    }




    /** Strict resolution: throw 400 if not resolvable. */
    private UUID resolveTenantStrict(HttpServletRequest req) {
        UUID orgId = resolveFromHeader(req);
        if (orgId == null) orgId = resolveFromSubdomain(req.getServerName());
        if (orgId == null) {
            throw badRequest("Organization is required (X-Org-Id header or tenant subdomain)");
        }
        return orgId;
    }

    /** Best-effort: resolve if provided, else return null — used for platform routes. */
    private UUID resolveTenantIfPresent(HttpServletRequest req) {
        UUID orgId = resolveFromHeader(req);
        if (orgId != null) return orgId;
        return resolveFromSubdomain(req.getServerName());
    }

    private UUID resolveFromHeader(HttpServletRequest req) {
        UUID fromHeader = parseUuidOrNull(req.getHeader(TENANT_HEADER));
        if (fromHeader == null) return null;

        OrganizationRepository repo = organizationsProvider.getIfAvailable();
        return (repo != null && repo.existsByOrgIdAndIsActiveTrue(fromHeader)) ? fromHeader : null;
    }

    private UUID resolveFromSubdomain(String host) {
        String sub = deriveSubdomain(host);
        if (sub == null) return null;
        OrganizationRepository repo = organizationsProvider.getIfAvailable();
        if (repo == null) return null;
        return repo.findIdBySubdomainIgnoreCaseAndIsActiveTrue(sub).orElse(null);
    }

    private boolean resolveSystemAdmin() {
        var a = SecurityContextHolder.getContext().getAuthentication();
        if (a == null || !a.isAuthenticated()) return false;

        // Role check
        if (a.getAuthorities().stream().anyMatch(au -> "SYSTEM_ADMIN".equalsIgnoreCase(au.getAuthority())))
            return true;

        // Claim check (JWT)
        Object principal = a.getPrincipal();
        try {
            var m = principal.getClass().getMethod("getClaims");
            Object claimsObj = m.invoke(principal);
            if (claimsObj instanceof Map<?, ?> claims) {
                Object v = claims.get("isSystemAdmin");
                if (v instanceof Boolean b) return b;
                if (v instanceof String s)  return Boolean.parseBoolean(s);
            }
        } catch (Exception ignored) { /* principal has no getClaims */ }

        if (principal instanceof Map<?, ?> claims) {
            Object v = claims.get("isSystemAdmin");
            if (v instanceof Boolean b) return b;
            if (v instanceof String s)  return Boolean.parseBoolean(s);
        }
        return false;
    }


    private UUID parseUuidOrNull(String s) {
        if (s == null || s.isBlank()) return null;
        try { return UUID.fromString(s.trim()); } catch (Exception e) { return null; }
    }

    private String deriveSubdomain(String host) {
        if (host == null || host.isBlank()) return null;
        String[] labels = host.split("\\.");
        if (labels.length >= 3) {
            String first = labels[0];
            if (!"www".equalsIgnoreCase(first)) return first;
        }
        return null;
    }




    @Override
    protected void doFilterInternal(HttpServletRequest req,
                                    HttpServletResponse res,
                                    FilterChain chain)
            throws ServletException, IOException {

        final String path = req.getRequestURI();
        final boolean tenantScoped = isTenantScoped(path);

        UUID orgId = tenantScoped ? resolveTenantStrict(req) : resolveTenantIfPresent(req);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        UUID userId = null;
        boolean isSystemAdmin = false;

        if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)) {
            Object principal = auth.getPrincipal();

            // --- JWT-based auth (resource server) ---
            if (auth instanceof JwtAuthenticationToken jwtAuth) {
                Jwt jwt = jwtAuth.getToken();
                // userId from claims (userId, user_id, uid, or sub)
                userId = extractUuidClaim(jwt, "userId", "user_id", "uid", "sub");

                // 1) Prefer JWT "isSystemAdmin" claim
                Object claimVal = jwt.getClaims().get("isSystemAdmin");
                if (claimVal instanceof Boolean b) {
                    isSystemAdmin = b;
                } else if (claimVal instanceof String s) {
                    isSystemAdmin = Boolean.parseBoolean(s);
                }

                // 2) Fallback to authorities (ROLE_SYSTEM_ADMIN, SYSTEM_ADMIN, etc.)
                if (!isSystemAdmin) {
                    isSystemAdmin = jwtAuth.getAuthorities().stream()
                            .map(GrantedAuthority::getAuthority)
                            .anyMatch(TenantFilter::isSystemAdminAuthority);
                }
            }
            // --- principal is raw Jwt ---
            else if (principal instanceof Jwt jwt) {
                userId = extractUuidClaim(jwt, "userId", "user_id", "uid", "sub");

                Object claimVal = jwt.getClaims().get("isSystemAdmin");
                if (claimVal instanceof Boolean b) {
                    isSystemAdmin = b;
                } else if (claimVal instanceof String s) {
                    isSystemAdmin = Boolean.parseBoolean(s);
                }

                if (!isSystemAdmin) {
                    isSystemAdmin = auth.getAuthorities().stream()
                            .map(GrantedAuthority::getAuthority)
                            .anyMatch(TenantFilter::isSystemAdminAuthority);
                }
            }
            // --- classic UserDetails-based auth ---
            else if (principal instanceof UserDetails ud) {
                try {
                    userId = UUID.fromString(ud.getUsername());
                } catch (Exception ignored) {}

                if (userId == null) {
                    userId = tryReflectiveGetUuid(principal, "getUserId", "getId", "userId");
                }

                isSystemAdmin = auth.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .anyMatch(TenantFilter::isSystemAdminAuthority);
            }
            // --- fallback: parse name + authorities ---
            else {
                try {
                    userId = UUID.fromString(auth.getName());
                } catch (Exception ignored) {}

                isSystemAdmin = auth.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .anyMatch(TenantFilter::isSystemAdminAuthority);
            }
        }

        // 🔍 Debug – keep this
        if (log.isDebugEnabled()) {
            log.debug("TenantFilter: path={}, tenantScoped={}, orgId={}, userId={}, isSystemAdmin={}, authPresent={}",
                    path, tenantScoped, orgId, userId, isSystemAdmin, (auth != null));
            if (auth != null) {
                auth.getAuthorities().forEach(a -> log.debug(" authority: {}", a.getAuthority()));
                log.debug(" principal class: {}", auth.getPrincipal() == null
                        ? "null"
                        : auth.getPrincipal().getClass().getName());
            }
        }

        try {
            TenantContext.set(userId, orgId, isSystemAdmin);
            if (orgId != null) MDC.put("orgId", orgId.toString());
            if (userId != null) MDC.put("userId", userId.toString());
            MDC.put("isSystemAdmin", Boolean.toString(isSystemAdmin));

            chain.doFilter(req, res);
        } finally {
            TenantContext.clear();
            MDC.remove("orgId");
            MDC.remove("userId");
            MDC.remove("isSystemAdmin");
        }
    }



// ---------- helpers ----------

    private static boolean isSystemAdminAuthority(String a) {
        if (a == null) return false;
        return a.equals("ROLE_SYSTEM_ADMIN") || a.equals("SYSTEM_ADMIN") || a.endsWith("SYSTEM_ADMIN");
    }


    private static UUID extractUuidClaim(Jwt jwt, String... names) {
        if (jwt == null) return null;
        for (String n : names) {
            Object v = jwt.getClaims().get(n);
            if (v instanceof String s) {
                try { return UUID.fromString(s); } catch (Exception ignored) {}
            }
        }
        String sub = jwt.getSubject();
        if (sub != null) {
            try { return UUID.fromString(sub); } catch (Exception ignored) {}
        }
        return null;
    }

    private static UUID tryReflectiveGetUuid(Object principal, String... methodNames) {
        if (principal == null) return null;
        for (String m : methodNames) {
            try {
                Method mm = principal.getClass().getMethod(m);
                Object v = mm.invoke(principal);
                if (v instanceof UUID u) return u;
                if (v instanceof String s) {
                    try { return UUID.fromString(s); } catch (Exception ignored) {}
                }
            } catch (NoSuchMethodException ignored) {
            } catch (Exception ex) {
                log.debug("reflective getUuid failed for method {}: {}", m, ex.getMessage());
            }
        }
        return null;
    }

    private static boolean tryReflectiveIsAdmin(Object principal) {
        if (principal == null) return false;
        String[] tries = new String[] {"isSystemAdmin", "isAdmin", "getRoles", "getAuthorities"};
        for (String m : tries) {
            try {
                Method mm = principal.getClass().getMethod(m);
                Object v = mm.invoke(principal);
                if (v instanceof Boolean b) return b;
                if (v instanceof String s && s.equalsIgnoreCase("SYSTEM_ADMIN")) return true;
                if (v instanceof java.util.Collection<?> coll) {
                    return coll.stream().anyMatch(x -> x != null && x.toString().contains("SYSTEM_ADMIN"));
                }
            } catch (NoSuchMethodException ignored) {
            } catch (Exception ex) {
                log.debug("reflective isAdmin failed for method {}: {}", m, ex.getMessage());
            }
        }
        return false;
    }

    /* ---------- error helper ---------- */

    public static class BadTenantSelectionException extends RuntimeException {
        public BadTenantSelectionException(String msg) { super(msg); }
    }
    private BadTenantSelectionException badRequest(String msg) {
        return new BadTenantSelectionException(msg);
    }
}


