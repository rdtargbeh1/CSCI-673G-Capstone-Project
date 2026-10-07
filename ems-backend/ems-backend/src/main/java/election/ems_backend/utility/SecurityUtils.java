package election.ems_backend.utility;


import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.ReflectionUtils;

import java.lang.reflect.Method;
import java.util.UUID;

/**
 * Small helper to extract organization id from the current Authentication.
 * Tries common places: Jwt claim "org_id" or "orgId", or a custom principal method getOrgId()/getOrganizationId().
 *
 * Non-blocking: returns null if no org id can be derived.
 */
public final class SecurityUtils {
    private SecurityUtils() {}

    public static UUID getOrgIdFromContext() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;

        Object principal = auth.getPrincipal();
        if (principal == null) return null;

        // If principal is a Jwt (resource server), try claims
        if (principal instanceof Jwt) {
            Jwt jwt = (Jwt) principal;
            Object claim = jwt.getClaim("org_id");
            if (claim == null) claim = jwt.getClaim("orgId");
            if (claim instanceof String) {
                try { return UUID.fromString((String) claim); } catch (IllegalArgumentException ignored) {}
            }
        }

        // Try reflection for common custom principal getters: getOrgId, getOrganizationId
        Method m = ReflectionUtils.findMethod(principal.getClass(), "getOrgId");
        if (m == null) m = ReflectionUtils.findMethod(principal.getClass(), "getOrganizationId");
        if (m != null) {
            try {
                Object v = ReflectionUtils.invokeMethod(m, principal);
                if (v instanceof UUID) return (UUID) v;
                if (v instanceof String) {
                    try { return UUID.fromString((String) v); } catch (IllegalArgumentException ignored) {}
                }
            } catch (Exception ignored) {
            }
        }

        return null;
    }

    public static UUID getUserIdFromContext() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;

        Object principal = auth.getPrincipal();
        if (principal == null) return null;

        if (principal instanceof Jwt jwt) {
            Object claim = jwt.getClaim("user_id");
            if (claim == null) claim = jwt.getClaim("userId");
            if (claim == null) claim = jwt.getClaim("sub"); // sometimes UUID stored as subject
            if (claim instanceof String s) {
                try { return UUID.fromString(s); } catch (IllegalArgumentException ignored) {}
            }
        }

        Method m = ReflectionUtils.findMethod(principal.getClass(), "getUserId");
        if (m == null) m = ReflectionUtils.findMethod(principal.getClass(), "getId");
        if (m != null) {
            try {
                Object v = ReflectionUtils.invokeMethod(m, principal);
                if (v instanceof UUID) return (UUID) v;
                if (v instanceof String s) {
                    try { return UUID.fromString(s); } catch (IllegalArgumentException ignored) {}
                }
            } catch (Exception ignored) {}
        }

        return null;
    }

}
