package election.ems_backend.service;

import election.ems_backend.dto.OrganizationBrandingUpdateRequest;
import election.ems_backend.dto.OrganizationCreateRequest;
import election.ems_backend.dto.OrganizationDto;
import election.ems_backend.dto.OrganizationUpdateRequest;
import election.ems_backend.utility.OrganizationSearchRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface OrganizationService {
    OrganizationDto create(OrganizationCreateRequest req);

    Optional<OrganizationDto> get(UUID orgId);

    Page<OrganizationDto> search(OrganizationSearchRequest req, Pageable pageable);

    OrganizationDto update(UUID orgId, OrganizationUpdateRequest req);

    void setActive(UUID orgId, boolean active);

    Optional<OrganizationDto> getBySubdomain(String subdomain);

    OrganizationDto updateBranding(UUID id, OrganizationBrandingUpdateRequest req);
}