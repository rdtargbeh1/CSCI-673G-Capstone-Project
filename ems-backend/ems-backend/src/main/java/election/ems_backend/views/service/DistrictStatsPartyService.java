package election.ems_backend.views.service;

import election.ems_backend.views.DistrictStatsPartySpecs;
import election.ems_backend.views.dto.DistrictStatsPartyDto;
import election.ems_backend.views.entity.DistrictStatsParty;
import election.ems_backend.views.mapper.DistrictStatsPartyMapper;
import election.ems_backend.views.repo.DistrictStatsPartyRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PostConstruct;
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
 * Service implementation that:
 *  - validates election existence,
 *  - applies tenant GUCs for RLS,
 *  - queries the view via repository/specifications,
 *  - maps to DTO.
 */
@Service
@RequiredArgsConstructor
public class DistrictStatsPartyService{

    private static final Logger log = LoggerFactory.getLogger(DistrictStatsPartyService.class);

    private final DistrictStatsPartyRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;
    private final DistrictStatsPartyMapper mapper = new DistrictStatsPartyMapper();

    private Counter requestCounter;

    @PostConstruct
    void initMetrics() {
        this.requestCounter = Counter.builder("api.stats.districts.requests")
                .description("Requests for district stats")
                .register(meterRegistry);
    }


    /**
     * Cacheable: caches pages per org/election/county/district/page/size/sort.
     * Use a small TTL in cache configuration to keep data reasonably fresh.
     */

    @Transactional(readOnly = true)
    @Cacheable(value = "districtStatsParty", key = "T(java.lang.String).valueOf(#orgId) + ':' + #electionId + ':' + " +
            "(#countyId==null?'':#countyId) + ':' + (#districtId==null?'':#districtId) + ':' + #pageable.pageNumber + ':' + #pageable.pageSize + ':' + #pageable.sort")
    public Page<DistrictStatsPartyDto> listDistrictStats(UUID orgId, UUID electionId, UUID countyId, UUID districtId, Pageable pageable) {

        requestCounter.increment();

        log.debug("listDistrictStats called orgId={} electionId={} countyId={} districtId={} page={} size={}",
                orgId, electionId, countyId, districtId, pageable.getPageNumber(), pageable.getPageSize());

        if (orgId == null) {
            throw new IllegalArgumentException("orgId is required");
        }
        electionValidationService.ensureExists(electionId);

        // Important: apply tenant GUCs BEFORE running repository queries so RLS policies will see them.
        tenantGucService.applyForTransaction(orgId, false, false);

        Specification<DistrictStatsParty> spec = Specification
                .where(DistrictStatsPartySpecs.orgEquals(orgId))
                .and(DistrictStatsPartySpecs.electionEquals(electionId))
                .and(DistrictStatsPartySpecs.countyEquals(countyId))
                .and(DistrictStatsPartySpecs.districtEquals(districtId));

        Page<DistrictStatsParty> page = repo.findAll(spec, pageable);

        // map and return
        Page<DistrictStatsPartyDto> dtoPage = page.map(mapper::toDto);
        log.debug("listDistrictStats returning {} elements (totalElements={})", dtoPage.getNumberOfElements(), dtoPage.getTotalElements());

        // instrumentation
        meterRegistry.gauge("api.stats.districts.result_size", dtoPage.getContent(), c -> (double) c.size());

        return dtoPage;
    }
}