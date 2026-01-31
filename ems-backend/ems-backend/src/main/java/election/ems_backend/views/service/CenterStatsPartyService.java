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
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
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

    private static final Logger log = LoggerFactory.getLogger(CenterStatsPartyService.class);
    private final MeterRegistry meterRegistry;

    /**
     * List center stats for given org/election filters.
     *
     * Notes:
     *  - This method is transactional and applies the tenant GUCs at the start of the transaction so DB RLS policies that depend
     *    on app.current_org/app.is_system_admin will be effective for subsequent queries.
     *  - Validates that the election exists using ElectionValidationService.
     */
    @Transactional(readOnly = true)
    @Cacheable(
            value = "centerStatsParty",
            key =
                    "T(java.lang.String).valueOf(#orgId)"
                            + " + ':' + #electionId"
                            + " + ':' + (#contestId==null?'':#contestId)"
                            + " + ':' + (#countyId==null?'':#countyId)"
                            + " + ':' + (#districtId==null?'':#districtId)"
                            + " + ':' + (#centerId==null?'':#centerId)"
                            + " + ':' + #pageable.pageNumber + ':' + #pageable.pageSize + ':' + #pageable.sort"
    )
    public Page<CenterStatsPartyDto> listCenterStats(
            UUID orgId,
            UUID electionId,
            UUID contestId,   // ✅ NEW
            UUID countyId,
            UUID districtId,
            UUID centerId,
            Pageable pageable
    ) {
        log.debug("listCenterStatsParty orgId={} electionId={} contestId={} countyId={} districtId={} centerId={} page={} size={}",
                orgId, electionId, contestId, countyId, districtId, centerId,
                pageable.getPageNumber(), pageable.getPageSize());

        if (orgId == null) throw new IllegalArgumentException("orgId is required");
        if (electionId == null) throw new IllegalArgumentException("electionId is required");
        electionValidationService.ensureExists(electionId);

        tenantGucService.applyForTransaction(orgId, false, false);

        Specification<CenterStatsParty> spec = Specification
                .where(CenterStatsPartySpecs.orgEquals(orgId))
                .and(CenterStatsPartySpecs.electionEquals(electionId))
                .and(CenterStatsPartySpecs.contestEquals(contestId)) // ✅ NEW
                .and(CenterStatsPartySpecs.countyEquals(countyId))
                .and(CenterStatsPartySpecs.districtEquals(districtId))
                .and(CenterStatsPartySpecs.centerEquals(centerId));

        Page<CenterStatsParty> page = repo.findAll(spec, pageable);

        meterRegistry.gauge("api.stats.center_party.result_size", page.getContent(), c -> (double) c.size());
        return page.map(mapper::toDto);
    }



}