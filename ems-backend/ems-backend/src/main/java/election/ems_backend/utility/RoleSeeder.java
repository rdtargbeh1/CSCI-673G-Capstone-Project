package election.ems_backend.utility;

import election.ems_backend.entity.UserRole;
import election.ems_backend.enums.RoleName;
import election.ems_backend.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Seed user roles. Mark core/builtin roles as isBuiltin=true so they are protected.
 */
@Component
@RequiredArgsConstructor
public class RoleSeeder implements CommandLineRunner {
    private final UserRoleRepository roles;

    @Override
    public void run(String... args) {
        for (RoleName rn : RoleName.values()) {
            roles.findByRoleName(rn).orElseGet(() -> {
                // Mark common core roles builtin to prevent deletion
                boolean builtin = switch (rn) {
                    case SYSTEM_ADMIN, NEC_ADMIN, ADMIN, TENANT_ADMIN, FIELD_OFFICER, OBSERVER, PRESIDING_OFFICER,
                         SUPERVISOR, COORDINATOR, TALLY_OFFICER, DATA_ENTRY, AUDITOR -> true;
                    default -> false;
                };
                return roles.save(UserRole.builder()
                        .roleName(rn)
                        .description(rn.name())
                        .isBuiltin(builtin)
                        .build());
            });
        }
    }
}