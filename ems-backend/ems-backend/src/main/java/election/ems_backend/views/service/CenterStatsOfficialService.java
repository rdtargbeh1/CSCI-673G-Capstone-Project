
package election.ems_backend.views.service;

import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.CenterStatsOfficialSpecs;
import election.ems_backend.views.dto.CenterStatsOfficialDto;
import election.ems_backend.views.entity.CenterStatsOfficial;
import election.ems_backend.views.mapper.CenterStatsOfficialMapper;
import election.ems_backend.views.repo.CenterStatsOfficialRepository;
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
 * Service for NEC official center stats (v_center_stats_official).
 *
 * Note: v_center_stats_official already filters nr.is_published = TRUE, so this
 * service returns only published official results.
 *
 * Important RLS note: Ensure your DB RLS policy for nec_result allows published
 * rows to be visible to non-NEC orgs (i.e., policies likely use (is_published = true) OR (current org is NEC)).
 *
 * NOTE: contestId is OPTIONAL:
 * - contestId == null => return rows for ALL contests (no contest filter applied)
 */
@Service
@RequiredArgsConstructor
public class CenterStatsOfficialService {

    private static final Logger log = LoggerFactory.getLogger(CenterStatsOfficialService.class);

    private final CenterStatsOfficialRepository repo;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;
    private final CenterStatsOfficialMapper mapper = new CenterStatsOfficialMapper();

    @Transactional(readOnly = true)
    @Cacheable(
            value = "centerStatsOfficial",
            key = "T(java.lang.String).valueOf(#electionId)"
                    + " + ':' + (#contestId==null?'':#contestId)"
                    + " + ':' + (#countyId==null?'':#countyId)"
                    + " + ':' + (#districtId==null?'':#districtId)"
                    + " + ':' + (#centerId==null?'':#centerId)"
                    + " + ':' + #pageable.pageNumber + ':' + #pageable.pageSize + ':' + #pageable.sort"
    )
    public Page<CenterStatsOfficialDto> listOfficialCenters(
            UUID electionId,
            UUID contestId,   // ✅ OPTIONAL now
            UUID countyId,
            UUID districtId,
            UUID centerId,
            Pageable pageable
    ) {
        log.debug("listOfficialCenters called electionId={} contestId={} countyId={} districtId={} centerId={} page={} size={}",
                electionId, contestId, countyId, districtId, centerId, pageable.getPageNumber(), pageable.getPageSize());

        if (electionId == null) throw new IllegalArgumentException("electionId is required");
        // ✅ contestId is OPTIONAL (no validation)

        // Derive orgId from security context (if present) and apply tenant GUCs for the transaction.
        UUID derivedOrgId = SecurityUtils.getOrgIdFromContext();

        if (derivedOrgId != null) {
            // apply derived org to transaction GUCs; policies must be written to allow published rows
            tenantGucService.applyForTransaction(derivedOrgId, false, false);
        } else {
            // explicit cast so compiler picks the UUID overload: applyForTransaction(UUID, boolean, boolean)
            tenantGucService.applyForTransaction((java.util.UUID) null, false, false);
        }

        Specification<CenterStatsOfficial> spec = Specification
                .where(CenterStatsOfficialSpecs.electionEquals(electionId))
                // ✅ contest filter applied ONLY if contestId != null (spec must return null when contestId is null)
                .and(CenterStatsOfficialSpecs.contestEquals(contestId))
                .and(CenterStatsOfficialSpecs.countyEquals(countyId))
                .and(CenterStatsOfficialSpecs.districtEquals(districtId))
                .and(CenterStatsOfficialSpecs.centerEquals(centerId));

        Page<CenterStatsOfficial> page = repo.findAll(spec, pageable);

        meterRegistry.gauge("api.stats.official.center.result_size", page.getContent(), c -> (double) c.size());

        return page.map(mapper::toDto);
    }
}
