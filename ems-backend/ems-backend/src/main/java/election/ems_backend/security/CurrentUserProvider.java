package election.ems_backend.security;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Map;
import java.util.UUID;

/**
 * Centralized accessor for "who is the current user?" in business code
 * (authorization services, auditing helpers, etc.).
 *
 * Resolution order (production):
 *  1) Jwt principal -> claims: "userId" (preferred), then "user_id", "uid", then "sub"
 *  2) Custom principal via getUserId() (UUID or String UUID)
 *  3) Principal is a Map of claims -> same keys
 *  4) Fallback: Authentication.getName() parsed as UUID
 *
 * Returns null if not authenticated or if no UUID can be derived.
 */
public interface CurrentUserProvider {

    UUID currentUserId();

    boolean isAuthenticated();

    static CurrentUserProvider springSecurity() {
        return new CurrentUserProvider() {

            @Override
            public UUID currentUserId() {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) return null;

                Object principal = auth.getPrincipal();
                if (principal == null) return null;

                // 1) Fast path: principal is a Jwt (OAuth2 Resource Server)
                UUID id = fromJwtPrincipal(principal);
                if (id != null) return id;

                // 2) Custom principal with getUserId()
                id = fromCustomPrincipal(principal);
                if (id != null) return id;

                // 3) Principal as Map of claims
                if (principal instanceof Map<?, ?> claims) {
                    id = fromClaimsMap(claims);
                    if (id != null) return id;
                }

                // 4) Fallback: try Authentication.getName() as UUID
                return parseUuidOrNull(auth.getName());
            }

            @Override
            public boolean isAuthenticated() {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) return false;
                String name = auth.getName();
                return name != null && !name.isBlank() && !"anonymousUser".equals(name);
            }

            /* ---------------- helpers ---------------- */

            private UUID fromJwtPrincipal(Object principal) {
                if (principal instanceof Jwt jwt) {
                    // Prefer explicit user id claims first
                    UUID u;

                    u = claimUuid(jwt, "userId");
                    if (u != null) return u;

                    u = claimUuid(jwt, "user_id");
                    if (u != null) return u;

                    u = claimUuid(jwt, "uid");
                    if (u != null) return u;

                    // Then subject
                    return parseUuidOrNull(jwt.getSubject());
                } else {
                    // Avoid a hard Jwt dep if principal exposes getClaims() reflectively
                    try {
                        var m = principal.getClass().getMethod("getClaims");
                        Object claimsObj = m.invoke(principal);
                        if (claimsObj instanceof Map<?, ?> claims) {
                            return fromClaimsMap(claims);
                        }
                    } catch (Exception ignored) {}
                }
                return null;
            }

            private UUID claimUuid(Jwt jwt, String key) {
                Object v = jwt.getClaims().get(key);
                if (v instanceof String s) return parseUuidOrNull(s);
                return null;
            }

            private UUID fromCustomPrincipal(Object principal) {
                try {
                    var m = principal.getClass().getMethod("getUserId");
                    Object v = m.invoke(principal);
                    if (v instanceof UUID u) return u;
                    if (v instanceof String s) return parseUuidOrNull(s);
                } catch (Exception ignored) {}
                return null;
            }

            private UUID fromClaimsMap(Map<?, ?> claims) {
                Object v = claims.get("userId");
                if (v == null) v = claims.get("user_id");
                if (v == null) v = claims.get("uid");
                if (v == null) v = claims.get("sub");
                if (v instanceof String s) return parseUuidOrNull(s);
                return null;
            }

            private UUID parseUuidOrNull(String s) {
                if (s == null || s.isBlank()) return null;
                try { return UUID.fromString(s.trim()); } catch (Exception ignored) { return null; }
            }
        };
    }


}


