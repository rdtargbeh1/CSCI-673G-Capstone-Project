package election.ems_backend.service;

import election.ems_backend.dto.UserCreateRoleRequest;
import election.ems_backend.dto.UserRoleDto;
import election.ems_backend.dto.UserUpdateRoleRequest;
import election.ems_backend.enums.RoleName;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface UserRoleService {

    UserRoleDto create(UserCreateRoleRequest req);
    Optional<UserRoleDto> getById(UUID roleId);
    Optional<UserRoleDto> getByName(RoleName roleName);
    Page<UserRoleDto> list(Pageable pageable);
    UserRoleDto update(UUID roleId, UserUpdateRoleRequest req);
    void delete(UUID roleId); // guarded (no delete if in use or if core role)
}