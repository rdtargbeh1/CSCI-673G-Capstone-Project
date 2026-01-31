package election.ems_backend.views.service;

import election.ems_backend.views.CountyStatsPartySpecs;
import election.ems_backend.views.dto.CountyStatsPartyDto;
import election.ems_backend.views.entity.CountyStatsParty;
import election.ems_backend.views.mapper.CountyStatsPartyMapper;
import election.ems_backend.views.repo.CountyStatsPartyRepository;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Production-ready service for county-level party stats.
 *
 * - Validates election existence (centralized).
 * - Applies tenant GUCs before queries for RLS.
 * - Caches pages for short TTL.
 * - Emits metrics and logs.
 */
@Service
@RequiredArgsConstructor
public class CountyStatsPartyService {

    private static final Logger log = LoggerFactory.getLogger(CountyStatsPartyService.class);

    private final CountyStatsPartyRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;
    private final CountyStatsPartyMapper mapper = new CountyStatsPartyMapper();


    @Transactional(readOnly = true)
    @Cacheable(
            value = "countyStatsParty",
            key = "T(java.lang.String).valueOf(#orgId) + ':' + #electionId"
                    + " + ':' + (#contestId==null?'':#contestId)"
                    + " + ':' + (#countyId==null?'':#countyId)"
                    + " + ':' + #pageable.pageNumber + ':' + #pageable.pageSize + ':' + #pageable.sort"
    )
    public Page<CountyStatsPartyDto> listCountyStats(
            UUID orgId,
            UUID electionId,
            UUID contestId,   // ✅ NEW
            UUID countyId,
            Pageable pageable
    ) {
        log.debug("listCountyStats called orgId={} electionId={} contestId={} countyId={} page={} size={}",
                orgId, electionId, contestId, countyId, pageable.getPageNumber(), pageable.getPageSize());

        if (orgId == null) throw new IllegalArgumentException("orgId is required");
        if (electionId == null) throw new IllegalArgumentException("electionId is required");

        electionValidationService.ensureExists(electionId);

        tenantGucService.applyForTransaction(orgId, false, false);

        Specification<CountyStatsParty> spec = Specification
                .where(CountyStatsPartySpecs.orgEquals(orgId))
                .and(CountyStatsPartySpecs.electionEquals(electionId))
                .and(CountyStatsPartySpecs.contestEquals(contestId))   // ✅ NEW
                .and(CountyStatsPartySpecs.countyEquals(countyId));

        Page<CountyStatsParty> page = repo.findAll(spec, pageable);

        meterRegistry.gauge("api.stats.county.result_size", page.getContent(), c -> (double) c.size());

        return page.map(mapper::toDto);
    }

}