
package election.ems_backend.views.service;

import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.DistrictStatsOfficialSpecs;
import election.ems_backend.views.dto.DistrictStatsOfficialDto;
import election.ems_backend.views.entity.DistrictStatsOfficial;
import election.ems_backend.views.mapper.DistrictStatsOfficialMapper;
import election.ems_backend.views.repo.DistrictStatsOfficialRepository;
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
 * Service for v_district_stats_official.
 * Returns only aggregated official (published) NEC stats.
 *
 * NOTE: contestId is OPTIONAL:
 * - contestId == null => return rows for ALL contests (no contest filter applied)
 */
@Service
@RequiredArgsConstructor
public class DistrictStatsOfficialService {

    private static final Logger log = LoggerFactory.getLogger(DistrictStatsOfficialService.class);

    private final DistrictStatsOfficialRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;
    private final DistrictStatsOfficialMapper mapper = new DistrictStatsOfficialMapper();

    @Transactional(readOnly = true)
    @Cacheable(
            value = "districtStatsOfficial",
            key = "T(java.lang.String).valueOf(#electionId)"
                    + " + ':' + (#contestId==null?'':#contestId)"
                    + " + ':' + (#countyId==null?'':#countyId)"
                    + " + ':' + (#districtId==null?'':#districtId)"
                    + " + ':' + #pageable.pageNumber + ':' + #pageable.pageSize + ':' + #pageable.sort"
    )
    public Page<DistrictStatsOfficialDto> listOfficialDistricts(
            UUID electionId,
            UUID contestId,   // ✅ OPTIONAL now
            UUID countyId,
            UUID districtId,
            Pageable pageable
    ) {
        log.debug("listOfficialDistricts called electionId={} contestId={} countyId={} districtId={} page={} size={}",
                electionId, contestId, countyId, districtId, pageable.getPageNumber(), pageable.getPageSize());

        if (electionId == null) throw new IllegalArgumentException("electionId is required");

        electionValidationService.ensureExists(electionId);

        // Keep your existing tenant scoping behavior (if applicable in your deployment).
        UUID derivedOrgId = SecurityUtils.getOrgIdFromContext();
        if (derivedOrgId != null) {
            tenantGucService.applyForTransaction(derivedOrgId, false, false);
        } else {
            // explicit cast so compiler picks the UUID overload if you have overloaded methods
            tenantGucService.applyForTransaction((UUID) null, false, false);
        }

        Specification<DistrictStatsOfficial> spec = Specification
                .where(DistrictStatsOfficialSpecs.electionEquals(electionId))
                // ✅ contest filter applied ONLY if contestId != null (spec must return null when contestId is null)
                .and(DistrictStatsOfficialSpecs.contestEquals(contestId))
                .and(DistrictStatsOfficialSpecs.countyEquals(countyId))
                .and(DistrictStatsOfficialSpecs.districtEquals(districtId));

        Page<DistrictStatsOfficial> page = repo.findAll(spec, pageable);

        meterRegistry.gauge("api.stats.official.district.result_size", page.getContent(), c -> (double) c.size());

        return page.map(mapper::toDto);
    }
}
