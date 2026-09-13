package election.ems_backend.config;

import election.ems_backend.security.CurrentUserProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Provides the production CurrentUserProvider bean.
 *
 * This bridges Spring Security’s Authentication context to your domain logic
 * (so services can easily fetch the current user ID without knowing about
 * SecurityContextHolder directly).
 */
@Configuration
public class SecurityProvidersConfig {

    @Bean
    public CurrentUserProvider currentUserProvider() {
        // Uses your static factory that reads from SecurityContextHolder
        return CurrentUserProvider.springSecurity();
    }
}