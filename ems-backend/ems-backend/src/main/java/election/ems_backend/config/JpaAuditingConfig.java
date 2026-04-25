package election.ems_backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Enables Spring Data JPA auditing and wires a production-ready AuditorAware
 * that reads the authenticated principal from Spring Security.
 */
@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
public class JpaAuditingConfig {

    /**
     * AuditorAware that always resolves the current authenticated user's "name"
     * (username/email) from Spring Security; falls back to "system" for
     * batch jobs, async tasks, or early bootstrapping.
     */
    @Bean
    public AuditorAware<String> auditorAware() {
        return new SecurityAuditorAware();
    }
}