package election.ems_backend.views.service;

import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.CountyStatsOfficialSpecs;
import election.ems_backend.views.dto.CountyStatsOfficialDto;
import election.ems_backend.views.entity.CountyStatsOfficial;
import election.ems_backend.views.mapper.CountyStatsOfficialMapper;
import election.ems_backend.views.repo.CountyStatsOfficialRepository;
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
 * Service for v_county_stats_official.
 */
@Service
@RequiredArgsConstructor
public class CountyStatsOfficialService {

    private static final Logger log = LoggerFactory.getLogger(CountyStatsOfficialService.class);

    private final CountyStatsOfficialRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;
    private final CountyStatsOfficialMapper mapper = new CountyStatsOfficialMapper();


    @Transactional(readOnly = true)
    @Cacheable(
            value = "countyStatsOfficial",
            key = "T(java.lang.String).valueOf(#electionId)"
                    + " + ':' + (#contestId==null?'':#contestId)"          // ✅ NEW
                    + " + ':' + (#countyId==null?'':#countyId)"
                    + " + ':' + #pageable.pageNumber + ':' + #pageable.pageSize + ':' + #pageable.sort"
    )
    public Page<CountyStatsOfficialDto> listOfficialCounties(
            UUID electionId,
            UUID contestId,   // ✅ NEW
            UUID countyId,
            Pageable pageable
    ) {
        log.debug("listOfficialCounties called electionId={} contestId={} countyId={} page={} size={}",
                electionId, contestId, countyId, pageable.getPageNumber(), pageable.getPageSize());

        if (electionId == null) throw new IllegalArgumentException("electionId is required");

        electionValidationService.ensureExists(electionId);

        UUID derivedOrgId = SecurityUtils.getOrgIdFromContext();
        if (derivedOrgId != null) {
            tenantGucService.applyForTransaction(derivedOrgId, false, false);
        } else {
            tenantGucService.applyForTransaction((java.util.UUID) null, false, false);
        }

        Specification<CountyStatsOfficial> spec = Specification
                .where(CountyStatsOfficialSpecs.electionEquals(electionId))
                .and(CountyStatsOfficialSpecs.contestEquals(contestId)) // ✅ NEW
                .and(CountyStatsOfficialSpecs.countyEquals(countyId));

        Page<CountyStatsOfficial> page = repo.findAll(spec, pageable);

        meterRegistry.gauge("api.stats.official.county.result_size", page.getContent(), c -> (double) c.size());

        return page.map(mapper::toDto);
    }

}
