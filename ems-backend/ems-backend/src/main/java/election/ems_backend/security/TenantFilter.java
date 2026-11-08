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
import java.util.Locale;
import java.util.UUID;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
@RequiredArgsConstructor
public class TenantFilter extends OncePerRequestFilter {

    private static final String TENANT_HEADER =
            "X-Org-Id";

    private static final Logger log =
            LoggerFactory.getLogger(
                    TenantFilter.class
            );

    private final CurrentUserProvider currentUserProvider;

    private final SystemUserRepository systemUserRepository;

    private final ObjectProvider<OrganizationRepository> organizationsProvider;

    private final AuthorizationService authorizationService;

    // ========================================================================
    // FILTER EXCLUSIONS
    // ========================================================================

    @Override
    protected boolean shouldNotFilter(
            HttpServletRequest request
    ) {

        String path =
                request.getRequestURI();

        String method =
                request.getMethod();

        if ("OPTIONS".equalsIgnoreCase(method)) {
            return true;
        }

        return path.startsWith("/api/public/")
                || path.startsWith("/api/auth/")
                || path.startsWith("/actuator")
                || path.startsWith("/favicon")
                || path.startsWith("/assets")
                || path.startsWith("/static");
    }

    // ========================================================================
    // TENANT-SCOPED ROUTES
    // ========================================================================

    private boolean isTenantScoped(
            String path
    ) {

        if (path == null) {
            return false;
        }

        if (path.startsWith("/api/system/")) {
            return false;
        }

        if (path.startsWith("/api/elections")) {
            return false;
        }

        if (path.startsWith("/api/orgs")) {
            return false;
        }

        if (path.startsWith("/api/public/")) {
            return false;
        }

        if (path.startsWith("/api/auth/")) {
            return false;
        }

        /*
         * Current-user profile is allowed to resolve without forcing an
         * organization because SYSTEM_ADMIN may operate without one.
         */
        if (path.equals("/api/users/me")) {
            return false;
        }

        if (path.startsWith("/api/users/platform")) {
            return false;
        }

        if (path.startsWith("/api/users/bootstrap")) {
            return false;
        }

        /*
         * /api/access/me intentionally remains outside this strict list.
         *
         * It resolves the current portal and supports SYSTEM_ADMIN without
         * requiring X-Org-Id.
         *
         * For organization users, AuthorizationService.requireMembership()
         * inside the access controller still requires a valid current org.
         */

        return path.startsWith("/api/members")
                || path.startsWith("/api/chat/")
                || path.startsWith("/api/votes/")
                || path.startsWith("/api/org-settings")
                || path.startsWith("/api/tenants/")
                || path.startsWith("/api/vote-submissions")
                || path.startsWith("/api/users/");
    }

    // ========================================================================
    // TENANT RESOLUTION
    // ========================================================================

    /**
     * Strict tenant resolution.
     *
     * Used for routes that cannot operate without an organization.
     */
    private UUID resolveTenantStrict(
            HttpServletRequest request
    ) {

        UUID headerOrg =
                resolveFromHeader(
                        request,
                        false
                );

        UUID subdomainOrg =
                resolveFromSubdomain(
                        request.getServerName()
                );

        if (
                headerOrg != null
                        && subdomainOrg != null
                        && !headerOrg.equals(subdomainOrg)
        ) {

            throw badRequest(
                    "Tenant mismatch between X-Org-Id and subdomain"
            );
        }

        UUID validatedHeader =
                resolveFromHeader(
                        request,
                        true
                );

        if (validatedHeader != null) {
            return validatedHeader;
        }

        if (subdomainOrg != null) {
            return subdomainOrg;
        }

        throw badRequest(
                "Organization is required (X-Org-Id header or tenant subdomain)"
        );
    }

    /**
     * Best-effort tenant resolution.
     *
     * Used for platform/shared routes where an organization is optional.
     */
    private UUID resolveTenantIfPresent(
            HttpServletRequest request
    ) {

        UUID validatedHeader =
                resolveFromHeader(
                        request,
                        true
                );

        if (validatedHeader != null) {
            return validatedHeader;
        }

        return resolveFromSubdomain(
                request.getServerName()
        );
    }

    private UUID resolveFromHeader(
            HttpServletRequest request,
            boolean validateActive
    ) {

        UUID fromHeader =
                parseUuidOrNull(
                        request.getHeader(
                                TENANT_HEADER
                        )
                );

        if (fromHeader == null) {
            return null;
        }

        if (!validateActive) {
            return fromHeader;
        }

        OrganizationRepository repository =
                organizationsProvider.getIfAvailable();

        if (
                repository != null
                        && repository.existsByOrgIdAndIsActiveTrue(
                        fromHeader
                )
        ) {

            return fromHeader;
        }

        return null;
    }

    private UUID resolveFromSubdomain(
            String host
    ) {

        String subdomain =
                deriveSubdomain(
                        host
                );

        if (subdomain == null) {
            return null;
        }

        OrganizationRepository repository =
                organizationsProvider.getIfAvailable();

        if (repository == null) {
            return null;
        }

        return repository
                .findIdBySubdomainIgnoreCaseAndIsActiveTrue(
                        subdomain
                )
                .orElse(null);
    }

    private String deriveSubdomain(
            String host
    ) {

        if (
                host == null
                        || host.isBlank()
        ) {

            return null;
        }

        String[] labels =
                host.split("\\.");

        if (labels.length >= 3) {

            String first =
                    labels[0];

            if (!"www".equalsIgnoreCase(first)) {
                return first;
            }
        }

        return null;
    }

    // ========================================================================
    // REQUEST FILTER
    // ========================================================================

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain
    ) throws ServletException, IOException {

        String path =
                request.getRequestURI();

        boolean tenantScoped =
                isTenantScoped(
                        path
                );

        UUID orgId;

        try {

            orgId =
                    tenantScoped
                            ? resolveTenantStrict(request)
                            : resolveTenantIfPresent(request);

        } catch (BadTenantSelectionException ex) {

            writeJson(
                    response,
                    HttpServletResponse.SC_BAD_REQUEST,
                    "BAD_REQUEST",
                    ex.getMessage()
            );

            return;
        }

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        UUID userId =
                null;

        boolean isSystemAdmin =
                false;

        if (
                authentication != null
                        && authentication.isAuthenticated()
                        && !(authentication instanceof AnonymousAuthenticationToken)
        ) {

            Object principal =
                    authentication.getPrincipal();

            // ----------------------------------------------------------------
            // JWT AUTHENTICATION TOKEN
            // ----------------------------------------------------------------

            if (authentication instanceof JwtAuthenticationToken jwtAuth) {

                Jwt jwt =
                        jwtAuth.getToken();

                userId =
                        extractUuidClaim(
                                jwt,
                                "userId",
                                "user_id",
                                "uid",
                                "sub"
                        );

                Object claimValue =
                        jwt
                                .getClaims()
                                .get(
                                        "isSystemAdmin"
                                );

                if (claimValue instanceof Boolean value) {

                    isSystemAdmin =
                            value;

                } else if (claimValue instanceof String value) {

                    isSystemAdmin =
                            Boolean.parseBoolean(
                                    value
                            );
                }

                if (!isSystemAdmin) {

                    isSystemAdmin =
                            jwtAuth
                                    .getAuthorities()
                                    .stream()
                                    .map(
                                            GrantedAuthority::getAuthority
                                    )
                                    .anyMatch(
                                            TenantFilter::isSystemAdminAuthority
                                    );
                }

                // ----------------------------------------------------------------
                // JWT PRINCIPAL
                // ----------------------------------------------------------------

            } else if (principal instanceof Jwt jwt) {

                userId =
                        extractUuidClaim(
                                jwt,
                                "userId",
                                "user_id",
                                "uid",
                                "sub"
                        );

                Object claimValue =
                        jwt
                                .getClaims()
                                .get(
                                        "isSystemAdmin"
                                );

                if (claimValue instanceof Boolean value) {

                    isSystemAdmin =
                            value;

                } else if (claimValue instanceof String value) {

                    isSystemAdmin =
                            Boolean.parseBoolean(
                                    value
                            );
                }

                if (!isSystemAdmin) {

                    isSystemAdmin =
                            authentication
                                    .getAuthorities()
                                    .stream()
                                    .map(
                                            GrantedAuthority::getAuthority
                                    )
                                    .anyMatch(
                                            TenantFilter::isSystemAdminAuthority
                                    );
                }

                // ----------------------------------------------------------------
                // USER DETAILS
                // ----------------------------------------------------------------

            } else if (principal instanceof UserDetails userDetails) {

                try {

                    userId =
                            UUID.fromString(
                                    userDetails.getUsername()
                            );

                } catch (Exception ignored) {
                }

                if (userId == null) {

                    userId =
                            tryReflectiveGetUuid(
                                    principal,
                                    "getUserId",
                                    "getId",
                                    "userId"
                            );
                }

                isSystemAdmin =
                        authentication
                                .getAuthorities()
                                .stream()
                                .map(
                                        GrantedAuthority::getAuthority
                                )
                                .anyMatch(
                                        TenantFilter::isSystemAdminAuthority
                                );

                // ----------------------------------------------------------------
                // OTHER AUTHENTICATION
                // ----------------------------------------------------------------

            } else {

                try {

                    userId =
                            UUID.fromString(
                                    authentication.getName()
                            );

                } catch (Exception ignored) {
                }

                isSystemAdmin =
                        authentication
                                .getAuthorities()
                                .stream()
                                .map(
                                        GrantedAuthority::getAuthority
                                )
                                .anyMatch(
                                        TenantFilter::isSystemAdminAuthority
                                );
            }
        }

        if (log.isDebugEnabled()) {

            log.debug(
                    "TenantFilter: path={}, tenantScoped={}, orgId={}, userId={}, isSystemAdmin={}, authPresent={}",
                    path,
                    tenantScoped,
                    orgId,
                    userId,
                    isSystemAdmin,
                    authentication != null
            );
        }

        // ====================================================================
        // TENANT CONTEXT
        // ====================================================================

        try {

            TenantContext.set(
                    userId,
                    orgId,
                    isSystemAdmin
            );

            // ----------------------------------------------------------------
            // STRICT TENANT ROUTE
            // ----------------------------------------------------------------

            if (tenantScoped) {

                if (userId == null) {

                    writeJson(
                            response,
                            HttpServletResponse.SC_UNAUTHORIZED,
                            "UNAUTHORIZED",
                            "Authentication required"
                    );

                    return;
                }

                /*
                 * SYSTEM_ADMIN is platform-level and does not require a real
                 * OrgMembership row.
                 *
                 * All other users operating inside a tenant-scoped endpoint
                 * must have an enabled membership for the selected org.
                 */
                if (
                        orgId != null
                                && !isSystemAdmin
                ) {

                    try {

                        authorizationService
                                .requireMembership();

                    } catch (AccessDeniedException ex) {

                        if (log.isDebugEnabled()) {

                            log.debug(
                                    "Tenant membership denied: {}",
                                    ex.getMessage()
                            );
                        }

                        writeJson(
                                response,
                                HttpServletResponse.SC_FORBIDDEN,
                                "FORBIDDEN",
                                "Forbidden"
                        );

                        return;
                    }
                }
            }

            chain.doFilter(
                    request,
                    response
            );

        } finally {

            TenantContext.clear();
        }
    }

    // ========================================================================
    // ROLE HELPERS
    // ========================================================================

    /**
     * SYSTEM_ADMIN detection must use exact normalized equality.
     *
     * Accepted:
     *
     * SYSTEM_ADMIN
     * ROLE_SYSTEM_ADMIN
     *
     * Rejected:
     *
     * NOT_SYSTEM_ADMIN
     * FAKE_SYSTEM_ADMIN
     */
    private static boolean isSystemAdminAuthority(
            String authority
    ) {

        if (
                authority == null
                        || authority.isBlank()
        ) {

            return false;
        }

        String normalized =
                authority
                        .trim()
                        .toUpperCase(
                                Locale.ROOT
                        );

        if (normalized.startsWith("ROLE_")) {

            normalized =
                    normalized.substring(
                            "ROLE_".length()
                    );
        }

        return "SYSTEM_ADMIN".equals(
                normalized
        );
    }

    // ========================================================================
    // JWT / USER HELPERS
    // ========================================================================

    private static UUID extractUuidClaim(
            Jwt jwt,
            String... names
    ) {

        if (jwt == null) {
            return null;
        }

        for (String name : names) {

            Object value =
                    jwt
                            .getClaims()
                            .get(
                                    name
                            );

            if (value instanceof String stringValue) {

                try {

                    return UUID.fromString(
                            stringValue
                    );

                } catch (Exception ignored) {
                }
            }
        }

        String subject =
                jwt.getSubject();

        if (subject != null) {

            try {

                return UUID.fromString(
                        subject
                );

            } catch (Exception ignored) {
            }
        }

        return null;
    }

    private static UUID tryReflectiveGetUuid(
            Object principal,
            String... methodNames
    ) {

        if (principal == null) {
            return null;
        }

        for (String methodName : methodNames) {

            try {

                Method method =
                        principal
                                .getClass()
                                .getMethod(
                                        methodName
                                );

                Object value =
                        method.invoke(
                                principal
                        );

                if (value instanceof UUID uuid) {
                    return uuid;
                }

                if (value instanceof String stringValue) {

                    try {

                        return UUID.fromString(
                                stringValue
                        );

                    } catch (Exception ignored) {
                    }
                }

            } catch (NoSuchMethodException ignored) {

            } catch (Exception ex) {

                log.debug(
                        "reflective getUuid failed for method {}: {}",
                        methodName,
                        ex.getMessage()
                );
            }
        }

        return null;
    }

    private UUID parseUuidOrNull(
            String value
    ) {

        if (
                value == null
                        || value.isBlank()
        ) {

            return null;
        }

        try {

            return UUID.fromString(
                    value.trim()
            );

        } catch (Exception ignored) {

            return null;
        }
    }

    // ========================================================================
    // RESPONSE HELPERS
    // ========================================================================

    private void writeJson(
            HttpServletResponse response,
            int status,
            String error,
            String message
    ) throws IOException {

        response.setStatus(
                status
        );

        response.setCharacterEncoding(
                StandardCharsets.UTF_8.name()
        );

        response.setContentType(
                "application/json"
        );

        response
                .getWriter()
                .write(
                        "{\"error\":\""
                                + escape(error)
                                + "\",\"message\":\""
                                + escape(message)
                                + "\"}"
                );
    }

    private String escape(
            String value
    ) {

        if (value == null) {
            return "";
        }

        return value.replace(
                "\"",
                "\\\""
        );
    }

    // ========================================================================
    // TENANT ERROR
    // ========================================================================

    public static class BadTenantSelectionException
            extends RuntimeException {

        public BadTenantSelectionException(
                String message
        ) {

            super(
                    message
            );
        }
    }

    private BadTenantSelectionException badRequest(
            String message
    ) {

        return new BadTenantSelectionException(
                message
        );
    }
}

