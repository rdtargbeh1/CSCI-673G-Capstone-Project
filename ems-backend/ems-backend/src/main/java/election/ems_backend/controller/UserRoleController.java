package election.ems_backend.controller;

import election.ems_backend.dto.UserRoleDto;
import election.ems_backend.dto.UserUpdateRoleRequest;
import election.ems_backend.enums.RoleName;
import election.ems_backend.service.UserRoleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class UserRoleController {

    @Autowired
    private UserRoleService userRoleService;



    @GetMapping("/{id}")
    public ResponseEntity<UserRoleDto> getById(@PathVariable UUID id) {
        Optional<UserRoleDto> dto = userRoleService.getById(id);
        return dto.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/by-name/{name}")
    public ResponseEntity<UserRoleDto> getByName(@PathVariable RoleName name) {
        Optional<UserRoleDto> dto = userRoleService.getByName(name);
        return dto.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping
    public Page<UserRoleDto> list(@PageableDefault(size = 20, sort = "roleName") Pageable pageable) {
        return userRoleService.list(pageable);
    }

    @PutMapping("/{id}")
    public UserRoleDto update(@PathVariable UUID id, @Valid @RequestBody UserUpdateRoleRequest req) {
        return userRoleService.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        userRoleService.delete(id);
    }
}
