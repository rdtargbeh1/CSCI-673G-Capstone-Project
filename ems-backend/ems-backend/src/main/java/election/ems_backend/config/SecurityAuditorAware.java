package election.ems_backend.config;

import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Map;
import java.util.Optional;

/**
 * Resolves the current auditor (username/email) from Spring Security.
 * Works with:
 *  - UsernamePasswordAuthentication (form login)
 *  - OAuth2 Resource Server JWT (principal is a Jwt or has claims)
 *  - Custom principals exposing getUsername()/getEmail()
 *
 * Fallback is "system" to ensure auditing never breaks.
 */
public class SecurityAuditorAware implements AuditorAware<String> {

    private static final String FALLBACK = "system";

    @Override
    public Optional<String> getCurrentAuditor() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                return Optional.of(FALLBACK);
            }

            // 1) Custom principal with getUsername()/getEmail()
            String fromCustom = extractFromCustomPrincipal(auth.getPrincipal());
            if (fromCustom != null && !fromCustom.isBlank()) {
                return Optional.of(fromCustom);
            }

            // 2) Standard Spring principal name
            String name = auth.getName(); // often username or subject
            if (name != null && !name.isBlank() && !"anonymousUser".equals(name)) {
                return Optional.of(name);
            }

            // 3) Claims-style principal (e.g., Jwt.getClaims())
            String fromClaims = extractFromClaims(auth.getPrincipal());
            if (fromClaims != null && !fromClaims.isBlank()) {
                return Optional.of(fromClaims);
            }

            return Optional.of(FALLBACK);
        } catch (Exception ignore) {
            return Optional.of(FALLBACK);
        }
    }

    private String extractFromCustomPrincipal(Object principal) {
        if (principal == null) return null;
        try {
            // Prefer getUsername()
            var m1 = principal.getClass().getMethod("getUsername");
            Object v1 = m1.invoke(principal);
            if (v1 instanceof String s && !s.isBlank()) return s;
        } catch (Exception ignored) {}

        try {
            // Fallback getEmail()
            var m2 = principal.getClass().getMethod("getEmail");
            Object v2 = m2.invoke(principal);
            if (v2 instanceof String s && !s.isBlank()) return s;
        } catch (Exception ignored) {}
        return null;
    }

    @SuppressWarnings("unchecked")
    private String extractFromClaims(Object principal) {
        // Avoid compile-time dependency on Jwt. Try reflectively to call getClaims().
        try {
            var getClaims = principal.getClass().getMethod("getClaims");
            Object claimsObj = getClaims.invoke(principal);
            if (claimsObj instanceof Map<?, ?> claims) {
                // Prefer "preferred_username", then "email", then "sub"
                Object pu = claims.get("preferred_username");
                if (pu instanceof String s && !s.isBlank()) return s;

                Object em = claims.get("email");
                if (em instanceof String s2 && !s2.isBlank()) return s2;

                Object sub = claims.get("sub");
                if (sub instanceof String s3 && !s3.isBlank()) return s3;
            }
        } catch (Exception ignored) {}
        return null;
    }
}
