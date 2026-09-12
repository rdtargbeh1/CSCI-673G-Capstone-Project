package election.ems_backend.config;


import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import com.nimbusds.jose.jwk.RSAKey;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;

@Configuration
public class LocalJwtConfig {

    /**
     * Issuer used for both token generation and validation.
     * Set in application.yml: app.security.issuer: "https://vote-tracker.local"
     */
    @Value("${app.security.issuer:https://vote-tracker.local}")
    private String issuer;

    @Bean
    KeyPair jwtKeyPair() {
        try {
            KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
            kpg.initialize(2048);
            return kpg.generateKeyPair();
        } catch (Exception e) {
            throw new IllegalStateException("Unable to generate RSA key pair for JWT", e);
        }
    }

    @Bean
    RSAKey rsaJwk(KeyPair keyPair) {
        RSAPublicKey pub = (RSAPublicKey) keyPair.getPublic();
        RSAPrivateKey priv = (RSAPrivateKey) keyPair.getPrivate();
        // "kid" helps rotation later if you add more keys
        return new RSAKey.Builder(pub).privateKey(priv).keyID("local-rsa-1").build();
    }


    @Bean
    JWKSource<SecurityContext> jwkSource(RSAKey rsaKey) {
        var jwkSet = new com.nimbusds.jose.jwk.JWKSet(rsaKey);
        return (jwkSelector, securityContext) -> jwkSelector.select(jwkSet);
    }

    @Bean
    JwtEncoder jwtEncoder(JWKSource<SecurityContext> jwkSource) {
        return new NimbusJwtEncoder(jwkSource);
    }

    @Bean
    JwtDecoder jwtDecoder(KeyPair keyPair) {
        RSAPublicKey pub = (RSAPublicKey) keyPair.getPublic();
        var decoder = NimbusJwtDecoder.withPublicKey(pub).build();

        // Enforce issuer
        OAuth2TokenValidator<Jwt> issuerValidator = JwtValidators.createDefaultWithIssuer(issuer);
        decoder.setJwtValidator(issuerValidator);
        return decoder;
    }

    /**
     * Optional: customize how authorities are extracted from JWT (e.g., "roles" claim).
     * You can inject into your SecurityConfig if needed.
     */
    @Bean
    JwtAuthenticationConverter jwtAuthenticationConverter() {
        var converter = new JwtAuthenticationConverter();

        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            var out = new java.util.HashSet<org.springframework.security.core.GrantedAuthority>();

            // ----- roles claim -----
            Object rolesObj = jwt.getClaims().get("roles");
            if (rolesObj instanceof java.util.Collection<?> roles) {
                for (Object r : roles) {
                    if (r == null) continue;
                    String role = String.valueOf(r).trim();
                    if (role.isEmpty()) continue;

                    // ✅ normalize: allow "NEC_ADMIN" or "ROLE_NEC_ADMIN"
                    if (!role.startsWith("ROLE_")) role = "ROLE_" + role;

                    out.add(new org.springframework.security.core.authority.SimpleGrantedAuthority(role));
                }
            }

            // ----- optional: keep scopes too -----
            Object scopeObj = jwt.getClaims().get("scope");
            if (scopeObj instanceof String scopeStr && !scopeStr.isBlank()) {
                for (String s : scopeStr.split("\\s+")) {
                    if (!s.isBlank()) {
                        out.add(new org.springframework.security.core.authority.SimpleGrantedAuthority("SCOPE_" + s));
                    }
                }
            }

            return out;
        });

        return converter;
    }



}