package election.ems_backend.controller;

import election.ems_backend.dto.MemberSearchRequest;
import election.ems_backend.dto.MembershipCreateRequest;
import election.ems_backend.dto.OrgMembershipDto;
import election.ems_backend.service.OrgMembershipService;
import election.ems_backend.utility.SetEnabledRequest;
import election.ems_backend.utility.SetRoleRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/members")
public class OrgMembershipController {

    private final OrgMembershipService service;
    public OrgMembershipController(OrgMembershipService service) { this.service = service; }

    /** List current-tenant members with optional filters. */
    @GetMapping
    public Page<OrgMembershipDto> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String roleName,
            @RequestParam(required = false) Boolean enabled,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return service.listInTenant(new MemberSearchRequest(q, roleName, enabled), pageable);
    }

    /** Add/link an existing user to the current tenant. */
    @PostMapping
    public ResponseEntity<OrgMembershipDto> add(@Valid @RequestBody MembershipCreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.addMemberInTenant(req));
    }

    /** Change per-org role for a user. */
    @PatchMapping("/{userId}/role")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setRole(@PathVariable UUID userId, @Valid @RequestBody SetRoleRequest body) {
        service.setRoleInTenant(userId, body.getRoleName());
    }

    /** Enable/disable a membership (toggle access without delete). */
    @PatchMapping("/{userId}/enabled")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setEnabled(@PathVariable UUID userId, @Valid @RequestBody SetEnabledRequest body) {
        service.setEnabledInTenant(userId, body.getEnabled());
    }

    /** Remove membership from current tenant (does NOT delete the user). */
    @DeleteMapping("/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable UUID userId) {
        service.removeMemberInTenant(userId);
    }
}