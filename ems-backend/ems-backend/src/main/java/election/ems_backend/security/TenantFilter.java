package election.ems_backend.security;

import election.ems_backend.repository.OrganizationRepository;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.tenant.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.access.AccessDeniedException;
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
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
@RequiredArgsConstructor
public class TenantFilter extends OncePerRequestFilter {

    private static final String TENANT_HEADER = "X-Org-Id";

    private final CurrentUserProvider currentUserProvider; // (kept; may be used in your project)
    private final SystemUserRepository systemUserRepository; // (kept; may be used in your project)
    private final ObjectProvider<OrganizationRepository> organizationsProvider;

    private final AuthorizationService authorizationService;

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

    private boolean isTenantScoped(String path) {
        if (path == null) return false;

        if (path.startsWith("/api/system/")) return false;

        if (path.startsWith("/api/elections")) return false;
        if (path.startsWith("/api/orgs")) return false;
        if (path.startsWith("/api/public/")) return false;
        if (path.startsWith("/api/auth/")) return false;

        if (path.equals("/api/users/me")) return false;
        if (path.startsWith("/api/users/platform")) return false;
        if (path.startsWith("/api/users/bootstrap")) return false;

        return path.startsWith("/api/members")
                || path.startsWith("/api/chat/")
                || path.startsWith("/api/votes/")
                || path.startsWith("/api/org-settings")
                || path.startsWith("/api/tenants/")
                || path.startsWith("/api/users/");
    }

    /** Strict resolution: throw 400 if not resolvable. */
    private UUID resolveTenantStrict(HttpServletRequest req) {
        // ✅ NEW: enforce "header and subdomain must match" when both present
        UUID headerOrg = resolveFromHeader(req, false); // parse only (don’t validate active yet)
        UUID subOrg = resolveFromSubdomain(req.getServerName());

        if (headerOrg != null && subOrg != null && !headerOrg.equals(subOrg)) {
            throw badRequest("Tenant mismatch between X-Org-Id and subdomain");
        }

        // Prefer validated header, else validated subdomain
        UUID validatedHeader = resolveFromHeader(req, true);
        if (validatedHeader != null) return validatedHeader;

        if (subOrg != null) return subOrg;

        throw badRequest("Organization is required (X-Org-Id header or tenant subdomain)");
    }

    /** Best-effort: resolve if provided, else return null — used for platform routes. */
    private UUID resolveTenantIfPresent(HttpServletRequest req) {
        UUID validatedHeader = resolveFromHeader(req, true);
        if (validatedHeader != null) return validatedHeader;
        return resolveFromSubdomain(req.getServerName());
    }

    /**
     * @param validateActive if true, only return orgId when org is active
     */
    private UUID resolveFromHeader(HttpServletRequest req, boolean validateActive) {
        UUID fromHeader = parseUuidOrNull(req.getHeader(TENANT_HEADER));
        if (fromHeader == null) return null;

        if (!validateActive) return fromHeader;

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

        UUID orgId;
        try {
            orgId = tenantScoped ? resolveTenantStrict(req) : resolveTenantIfPresent(req);
        } catch (BadTenantSelectionException ex) {
            writeJson(res, 400, "BAD_REQUEST", ex.getMessage());
            return;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        UUID userId = null;
        boolean isSystemAdmin = false;

        if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)) {
            Object principal = auth.getPrincipal();

            if (auth instanceof JwtAuthenticationToken jwtAuth) {
                Jwt jwt = jwtAuth.getToken();
                userId = extractUuidClaim(jwt, "userId", "user_id", "uid", "sub");

                Object claimVal = jwt.getClaims().get("isSystemAdmin");
                if (claimVal instanceof Boolean b) isSystemAdmin = b;
                else if (claimVal instanceof String s) isSystemAdmin = Boolean.parseBoolean(s);

                if (!isSystemAdmin) {
                    isSystemAdmin = jwtAuth.getAuthorities().stream()
                            .map(GrantedAuthority::getAuthority)
                            .anyMatch(TenantFilter::isSystemAdminAuthority);
                }
            } else if (principal instanceof Jwt jwt) {
                userId = extractUuidClaim(jwt, "userId", "user_id", "uid", "sub");

                Object claimVal = jwt.getClaims().get("isSystemAdmin");
                if (claimVal instanceof Boolean b) isSystemAdmin = b;
                else if (claimVal instanceof String s) isSystemAdmin = Boolean.parseBoolean(s);

                if (!isSystemAdmin) {
                    isSystemAdmin = auth.getAuthorities().stream()
                            .map(GrantedAuthority::getAuthority)
                            .anyMatch(TenantFilter::isSystemAdminAuthority);
                }
            } else if (principal instanceof UserDetails ud) {
                try { userId = UUID.fromString(ud.getUsername()); } catch (Exception ignored) {}
                if (userId == null) userId = tryReflectiveGetUuid(principal, "getUserId", "getId", "userId");

                isSystemAdmin = auth.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .anyMatch(TenantFilter::isSystemAdminAuthority);
            } else {
                try { userId = UUID.fromString(auth.getName()); } catch (Exception ignored) {}

                isSystemAdmin = auth.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .anyMatch(TenantFilter::isSystemAdminAuthority);
            }
        }

        if (log.isDebugEnabled()) {
            log.debug("TenantFilter: path={}, tenantScoped={}, orgId={}, userId={}, isSystemAdmin={}, authPresent={}",
                    path, tenantScoped, orgId, userId, isSystemAdmin, (auth != null));
        }

        try {
            TenantContext.set(userId, orgId, isSystemAdmin);

            if (tenantScoped) {
                if (userId == null) {
                    writeJson(res, 401, "UNAUTHORIZED", "Authentication required");
                    return;
                }

                if (orgId != null && !isSystemAdmin) {
                    try {
                        authorizationService.requireMembership();
                    } catch (AccessDeniedException ex) {
                        // ✅ Do not leak membership state
                        if (log.isDebugEnabled()) {
                            log.debug("Tenant membership denied: {}", ex.getMessage());
                        }
                        writeJson(res, 403, "FORBIDDEN", "Forbidden");
                        return;
                    }
                }
            }

            chain.doFilter(req, res);
        } finally {
            TenantContext.clear();
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

    private void writeJson(HttpServletResponse res, int status, String error, String message) throws IOException {
        res.setStatus(status);
        res.setCharacterEncoding(StandardCharsets.UTF_8.name());
        res.setContentType("application/json");
        res.getWriter().write("{\"error\":\"" + escape(error) + "\",\"message\":\"" + escape(message) + "\"}");
    }

    private String escape(String s) {
        if (s == null) return "";
        return s.replace("\"", "\\\"");
    }

    // ---------- error helper ----------

    public static class BadTenantSelectionException extends RuntimeException {
        public BadTenantSelectionException(String msg) { super(msg); }
    }

    private BadTenantSelectionException badRequest(String msg) {
        return new BadTenantSelectionException(msg);
    }



}

