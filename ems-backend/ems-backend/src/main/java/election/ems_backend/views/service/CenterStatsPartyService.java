package election.ems_backend.views.service;

/**
 * Service exposing read-only center-level stats for a tenant.
 *
 * Behavior:
 *  - Applies tenant GUCs using TenantGucService with SET LOCAL inside the transactional scope.
 *  - Reads the view via the repository with pagination.
 */


import election.ems_backend.entity.PollingCenter;
import election.ems_backend.repository.PollingCenterRepository;
import election.ems_backend.views.CenterStatsPartySpecs;
import election.ems_backend.views.dto.CenterStatsPartyDto;
import election.ems_backend.views.entity.CenterStatsParty;
import election.ems_backend.views.mapper.CenterStatsPartyMapper;
import election.ems_backend.views.repo.CenterStatsPartyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service implementation that enriches DTOs with polling center coordinates (batched) and
 * enforces org/election scoping at service level (controller should provide orgId derived from auth).
 */
@Service
@RequiredArgsConstructor
public class CenterStatsPartyService {

    private final CenterStatsPartyRepository repo;
    private final PollingCenterRepository pollingCenterRepo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final CenterStatsPartyMapper mapper = new CenterStatsPartyMapper();


    /**
     * List center stats for given org/election filters.
     *
     * Notes:
     *  - This method is transactional and applies the tenant GUCs at the start of the transaction so DB RLS policies that depend
     *    on app.current_org/app.is_system_admin will be effective for subsequent queries.
     *  - Validates that the election exists using ElectionValidationService.
     */
    @Transactional(readOnly = true)
    public Page<CenterStatsPartyDto> listCenterStats(UUID orgId, UUID electionId, UUID countyId, UUID districtId, UUID centerId, Pageable pageable) {
        // Validate input via centralized helper
        if (orgId == null) {
            throw new IllegalArgumentException("orgId is required");
        }
        electionValidationService.ensureExists(electionId);

        // Apply tenant GUCs for current transaction so RLS policies evaluate correctly.
        // Treat caller as non-system and non-NEC admin; if your code has admin flags, pass them here.
        tenantGucService.applyForTransaction(orgId, false, false);

        Specification<CenterStatsParty> spec = Specification
                .where(CenterStatsPartySpecs.orgEquals(orgId))
                .and(CenterStatsPartySpecs.electionEquals(electionId))
                .and(CenterStatsPartySpecs.countyEquals(countyId))
                .and(CenterStatsPartySpecs.districtEquals(districtId))
                .and(CenterStatsPartySpecs.centerEquals(centerId));

        Page<CenterStatsParty> page = repo.findAll(spec, pageable);

        // Map entities to DTOs
        List<CenterStatsPartyDto> dtos = page.getContent().stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());

        // Batch fetch polling center coordinates for enrichment
        Set<UUID> centerIds = dtos.stream()
                .map(CenterStatsPartyDto::getCenterId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (!centerIds.isEmpty()) {
            List<PollingCenter> centers = pollingCenterRepo.findAllById(centerIds);
            Map<UUID, PollingCenter> byId = centers.stream()
                    .collect(Collectors.toMap(PollingCenter::getCenterId, c -> c));
            for (CenterStatsPartyDto d : dtos) {
                if (d.getCenterId() == null) continue;
                PollingCenter pc = byId.get(d.getCenterId());
                if (pc != null) {
                    d.setCenterLatitude(pc.getLatitude());
                    d.setCenterLongitude(pc.getLongitude());
                }
            }
        }

        return new PageImpl<>(dtos, pageable, page.getTotalElements());
    }



}