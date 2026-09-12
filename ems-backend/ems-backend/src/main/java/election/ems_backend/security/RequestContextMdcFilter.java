package election.ems_backend.security;


import election.ems_backend.tenant.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jboss.logging.MDC;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

/**
 * Request-scoped MDC population for forensic, multi-tenant logging.
 *
 * Populates (and always clears):
 *   - rid:           request id (also echoed to X-Request-Id)
 *   - user:          principal name, or "anonymous"
 *   - orgId:         current tenant id (if available)
 *   - isSystemAdmin: "true"/"false" (if available)
 *
 * ORDERING (required):
 *   Register this filter in SecurityConfig to run AFTER authentication and AFTER TenantFilter, e.g.:
 *     http.addFilterAfter(requestContextMdcFilter, TenantFilter.class);
 */
@Component
public class RequestContextMdcFilter extends OncePerRequestFilter {


    private static final String HDR_REQUEST_ID = "X-Request-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

        String rid = Optional.ofNullable(req.getHeader(HDR_REQUEST_ID))
                .filter(s -> !s.isBlank())
                .orElse(UUID.randomUUID().toString());

        MDC.put("rid", rid);
        res.setHeader(HDR_REQUEST_ID, rid);

        // User principal name (post-auth). Exclude AnonymousAuthenticationToken.
        String user = "anonymous";
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)) {
            String name = auth.getName();
            if (name != null && !name.isBlank() && !"anonymousUser".equals(name)) {
                user = name;
            }
        }
        MDC.put("user", user);

        // Tenant context (populated by TenantFilter earlier in the chain)
        var ctx = TenantContext.get();
        if (ctx != null) {
            ctx.orgId().map(UUID::toString).ifPresent(orgId -> MDC.put("orgId", orgId));
            ctx.userId().map(UUID::toString).ifPresent(uid -> MDC.put("userId", uid)); // ✅ add for forensics
            MDC.put("isSystemAdmin", Boolean.toString(ctx.isSystemAdmin()));
        }

        try {
            chain.doFilter(req, res);
        } finally {
            MDC.remove("rid");
            MDC.remove("user");
            MDC.remove("userId");        // ✅ remove added key
            MDC.remove("orgId");
            MDC.remove("isSystemAdmin");
        }
    }


}