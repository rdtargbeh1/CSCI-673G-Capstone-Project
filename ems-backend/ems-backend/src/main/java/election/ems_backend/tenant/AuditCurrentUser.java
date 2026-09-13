package election.ems_backend.tenant;

import election.ems_backend.security.CurrentUserProvider;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Audit-only adapter so we don't change existing CurrentUserProvider usage across the app.
 * Uses the existing CurrentUserProvider.springSecurity() implementation internally.
 */
@Component
public class AuditCurrentUser {
    private final CurrentUserProvider provider = CurrentUserProvider.springSecurity();

    public UUID userIdOrNull() {
        return provider.currentUserId();
    }

    public boolean isAuthenticated() {
        return provider.isAuthenticated();
    }
}