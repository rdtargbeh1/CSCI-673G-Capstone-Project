package election.ems_backend.security;

import election.ems_backend.entity.SystemUser;
import election.ems_backend.repository.SystemUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.lang.reflect.Method;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TokenService {

    private final SystemUserRepository users;
    private final JwtEncoder encoder;

    @Value("${app.security.issuer:https://vote-tracker.local}")
    private String issuer;

    @Value("${app.security.access-token-ttl:3600}")
    private long accessTokenTtlSeconds;

    public long expiresInSeconds() {
        return accessTokenTtlSeconds;
    }

    /**
     * ✅ NEW: Mint token with a sessionId (sid claim).
     */
    // TokenService.java
    public String mintAccessToken(Authentication auth, UUID sessionId) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(accessTokenTtlSeconds);

        Set<String> roles = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toUnmodifiableSet());

        boolean isSystemAdmin = roles.stream().anyMatch(r -> r != null && r.toUpperCase().endsWith("SYSTEM_ADMIN"));

        UUID userUuid = resolveUserUuidOrThrow(auth);
        String username = resolveUsername(auth);

        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .issuedAt(now)
                .expiresAt(exp)
                .subject(userUuid.toString())
                .claim("userId", userUuid.toString())
                .claim("userName", username)
                .claim("roles", roles)
                .claim("isSystemAdmin", isSystemAdmin);

        // ✅ session id claim used for revocation checks + logout
        if (sessionId != null) {
            claims.claim("sid", sessionId.toString());
        }

        return encoder.encode(JwtEncoderParameters.from(claims.build())).getTokenValue();
    }


    /**
     * Backward-compatible method (if some older code still calls it).
     * But you SHOULD use mintAccessToken(auth, sessionId).
     */
    public String mintAccessToken(Authentication auth) {
        // If this is used, sid won't exist → revocation won't work.
        // Keep it only to prevent compilation errors; phase it out.
        return mintAccessToken(auth, UUID.randomUUID());
    }

    private UUID resolveUserUuidOrThrow(Authentication auth) {
        Object principal = auth.getPrincipal();

        UUID reflected = tryReflectiveUuid(principal, "getUserId", "getId");
        if (reflected != null) return reflected;

        if (principal instanceof UserDetails ud) {
            UUID u = parseUuidOrNull(ud.getUsername());
            if (u != null) return u;
        }

        String identifier = resolveUsername(auth);
        if (identifier == null || identifier.isBlank()) {
            throw new IllegalStateException("Cannot mint token: missing username/email identifier");
        }

        SystemUser user = users.findByUserNameIgnoreCase(identifier)
                .orElseGet(() -> users.findByEmailIgnoreCase(identifier)
                        .orElseThrow(() -> new IllegalStateException("Cannot mint token: user not found for " + identifier)));

        return user.getUserId();
    }

    private String resolveUsername(Authentication auth) {
        Object principal = auth.getPrincipal();

        if (principal instanceof UserDetails ud) {
            return ud.getUsername();
        }

        try {
            Method m = principal.getClass().getMethod("getUserName");
            Object v = m.invoke(principal);
            if (v instanceof String s && !s.isBlank()) return s;
        } catch (Exception ignored) {}

        return auth.getName();
    }

    private UUID tryReflectiveUuid(Object principal, String... methods) {
        if (principal == null) return null;
        for (String m : methods) {
            try {
                Method mm = principal.getClass().getMethod(m);
                Object v = mm.invoke(principal);
                if (v instanceof UUID u) return u;
                if (v instanceof String s) {
                    UUID parsed = parseUuidOrNull(s);
                    if (parsed != null) return parsed;
                }
            } catch (Exception ignored) {}
        }
        return null;
    }

    private UUID parseUuidOrNull(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return UUID.fromString(s.trim());
        } catch (Exception ignored) {
            return null;
        }
    }
}


