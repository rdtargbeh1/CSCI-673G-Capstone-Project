package election.ems_backend.controller;

import election.ems_backend.dto.OrganizationBrandingUpdateRequest;
import election.ems_backend.dto.OrganizationCreateRequest;
import election.ems_backend.dto.OrganizationDto;
import election.ems_backend.dto.OrganizationUpdateRequest;
import election.ems_backend.enums.OrganizationType;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.service.OrganizationService;
import election.ems_backend.utility.OrganizationSearchRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
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
@RequestMapping("/api/orgs")
public class OrganizationController {

    @Autowired
    private OrganizationService organizationService;
    @Autowired
    private AuthorizationService authz;




    /**
     * Create a new organization (tenant).
     * Only platform SYSTEM_ADMIN can create organizations (tenants).
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrganizationDto create(@RequestBody @Valid OrganizationCreateRequest req) {
        return organizationService.create(req); // Delegates creation logic
    }

    /**
     * Update organization details. Only SYSTEM_ADMIN can perform this.
     */
    @PutMapping("/{id}")
    public OrganizationDto update(@PathVariable UUID id, @Valid @RequestBody OrganizationUpdateRequest req) {
        return organizationService.update(id, req);
    }

    @PatchMapping("/{id}/branding")
    public OrganizationDto updateBranding(
            @PathVariable UUID id,
            @Valid @RequestBody OrganizationBrandingUpdateRequest req
    ) {
        // ✅ org ADMIN/PARTY_ADMIN OR platform admin
        authz.requireAnyInTenantOrPlatformAdmin("ADMIN", "PARTY_ADMIN");
        return organizationService.updateBranding(id, req);
    }


    /**
     * Get details of an organization by its UUID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<OrganizationDto> get(@PathVariable UUID id) {
        return organizationService.get(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get details of an organization by its subdomain.
     */
    @GetMapping("/by-subdomain/{sub}")
    public ResponseEntity<OrganizationDto> getBySubdomain(@PathVariable String sub) {
        Optional<OrganizationDto> dto = organizationService.getBySubdomain(sub);
        return dto.map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Search for organizations with filters such as active status and type.
     */
    @GetMapping
    public Page<OrganizationDto> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) OrganizationType type,
            @PageableDefault(size = 20, sort = "dateCreated") Pageable pageable
    ) {
        OrganizationSearchRequest req = new OrganizationSearchRequest(q, active, type);
        return organizationService.search(req, pageable);
    }

    /**
     * Activate or deactivate an organization (tenant).
     * Only SYSTEM_ADMIN can perform this.
     */
    @PatchMapping("/{id}/active")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setActive(@PathVariable UUID id, @RequestBody @Valid SetActiveRequest body) {
        organizationService.setActive(id, body.active());
    }



    public record SetActiveRequest(@NotNull Boolean active) {}
    public record AssignPartyRequest(UUID partyId) {}



}