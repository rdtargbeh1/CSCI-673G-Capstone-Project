package election.ems_backend.security;

import election.ems_backend.repository.UserSessionRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class SessionRevocationFilter extends OncePerRequestFilter {

    private final UserSessionRepository sessions;

    @org.springframework.beans.factory.annotation.Value("${app.security.require-session-id:true}")
    private boolean requireSessionId;

    private final Clock clock;


        @Override
        protected boolean shouldNotFilter(HttpServletRequest request) {
            // ✅ always bypass CORS preflight
            if (HttpMethod.OPTIONS.matches(request.getMethod())) return true;

            String p = request.getRequestURI();
            if (p == null) return false;

            // ✅ bypass public endpoints
            return p.startsWith("/api/auth/")
                    || p.startsWith("/api/public/")
                    || p.equals("/actuator/health");
        }

        @Override
        protected void doFilterInternal(
                HttpServletRequest request,
                HttpServletResponse response,
                FilterChain filterChain
        ) throws ServletException, IOException {

            // ✅ if session enforcement is disabled, do nothing
            if (!requireSessionId) {
                filterChain.doFilter(request, response);
                return;
            }

            Authentication a = SecurityContextHolder.getContext().getAuthentication();

            if (a instanceof JwtAuthenticationToken jwtAuth && jwtAuth.isAuthenticated()) {
                var jwt = jwtAuth.getToken();

                String sid = jwt.getClaimAsString("sid");

                if (sid == null || sid.isBlank()) {
                    SecurityContextHolder.clearContext();
                    writeJson401(response, "UNAUTHORIZED", "Missing session id");
                    return;
                }

                final UUID sessionId;
                try {
                    sessionId = UUID.fromString(sid.trim());
                } catch (IllegalArgumentException ex) {
                    SecurityContextHolder.clearContext();
                    writeJson401(response, "UNAUTHORIZED", "Invalid session id");
                    return;
                }

                var sOpt = sessions.findById(sessionId);
                if (sOpt.isEmpty()) {
                    SecurityContextHolder.clearContext();
                    writeJson401(response, "UNAUTHORIZED", "Session not found");
                    return;
                }

                var s = sOpt.get();

                if (s.isRevoked()) {
                    SecurityContextHolder.clearContext();
                    writeJson401(response, "UNAUTHORIZED", "Session revoked");
                    return;
                }

                LocalDateTime now = LocalDateTime.now(clock);
                if (s.getExpiresDate() != null && s.getExpiresDate().isBefore(now)) {
                    SecurityContextHolder.clearContext();
                    writeJson401(response, "UNAUTHORIZED", "Session expired");
                    return;
                }
            }

            filterChain.doFilter(request, response);
        }

        private void writeJson401(HttpServletResponse response, String error, String message) throws IOException {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"" + safe(error) + "\",\"message\":\"" + safe(message) + "\"}");
        }

        private String safe(String s) {
            if (s == null) return "";
            return s.replace("\"", "\\\"");
        }



    }


