package election.ems_backend.repository;

import election.ems_backend.entity.UserRole;
import election.ems_backend.enums.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRoleRepository extends JpaRepository<UserRole, UUID> {

    Optional<UserRole> findByRoleName(RoleName roleName);
    boolean existsByRoleName(RoleName roleName);

    long countByRoleId(UUID roleId);

}
