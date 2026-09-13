package election.ems_backend.tenant;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
public class OrgContextFilter extends OncePerRequestFilter {

    public static final String HEADER_ORG_ID = "X-Org-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            // ✅ Only trust X-Org-Id when authenticated (prevents unauthenticated tenant spoofing)
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            boolean authenticated = auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken);

            if (authenticated) {
                String v = request.getHeader(HEADER_ORG_ID);
                if (v != null && !v.isBlank()) {
                    try { OrgContext.set(UUID.fromString(v.trim())); }
                    catch (IllegalArgumentException ignored) {}
                }
            }

            filterChain.doFilter(request, response);
        } finally {
            OrgContext.clear();
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri != null && uri.startsWith("/actuator");
    }
}


