package election.ems_backend.service.implement;

import election.ems_backend.dto.UserCreateRoleRequest;
import election.ems_backend.dto.UserRoleDto;
import election.ems_backend.dto.UserUpdateRoleRequest;
import election.ems_backend.entity.UserRole;
import election.ems_backend.enums.RoleName;
import election.ems_backend.mapper.UserRoleMapper;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.repository.UserRoleRepository;
import election.ems_backend.service.UserRoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service                                  // <-- critical annotation
@RequiredArgsConstructor
@Transactional
public class UserRoleServiceImplementation implements UserRoleService {

    @Autowired
    private UserRoleRepository userRoleRepository;
    @Autowired
    private SystemUserRepository userRepository;

    private final UserRoleMapper mapper = new UserRoleMapper();

    /** core roles we don’t allow deleting for safety */
    private static final Set<RoleName> CORE_ROLES = Set.of(
            RoleName.ADMIN, RoleName.TENANT_ADMIN, RoleName.AGENT,
            RoleName.OBSERVER, RoleName.SUPERVISOR, RoleName.COORDINATOR
    );

    @Override
    public UserRoleDto create(UserCreateRoleRequest req) {
        // Note: DB already restricts names to the enum; we enforce uniqueness at app level too.
        if (userRoleRepository.existsByRoleName(req.getRoleName())) {
            throw new IllegalArgumentException("Role already exists: " + req.getRoleName());
        }
        UserRole entity = mapper.toEntity(req);
        try {
            return mapper.toDTO(userRoleRepository.save(entity));
        } catch (DataIntegrityViolationException e) {
            // race protection
            throw new IllegalArgumentException("Role already exists: " + req.getRoleName());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UserRoleDto> getById(UUID roleId) {
        return userRoleRepository.findById(roleId).map(mapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UserRoleDto> getByName(RoleName roleName) {
        return userRoleRepository.findByRoleName(roleName).map(mapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserRoleDto> list(Pageable pageable) {
        return userRoleRepository.findAll(pageable).map(mapper::toDTO);
    }

    @Override
    public UserRoleDto update(UUID roleId, UserUpdateRoleRequest req) {
        UserRole role = userRoleRepository.findById(roleId)
                .orElseThrow(() -> new NoSuchElementException("Role not found"));
        mapper.apply(req, role); // only description
        return mapper.toDTO(role);
    }

    @Override
    public void delete(UUID roleId) {
        UserRole role = userRoleRepository.findById(roleId)
                .orElseThrow(() -> new NoSuchElementException("Role not found"));

        if (CORE_ROLES.contains(role.getRoleName())) {
            throw new IllegalArgumentException("Cannot delete core role: " + role.getRoleName());
        }

        long inUse = userRoleRepository.countByRoleId(roleId);
        if (inUse > 0) {
            throw new IllegalStateException("Cannot delete role that is assigned to users (" + inUse + ")");
        }

        userRoleRepository.delete(role);
    }
}
