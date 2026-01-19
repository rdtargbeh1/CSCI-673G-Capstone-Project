package election.ems_backend.views.service;

import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.CandidateCenterStatsOfficialSpecs;
import election.ems_backend.views.dto.CandidateCenterStatsOfficialDto;
import election.ems_backend.views.entity.CandidateCenterStatsOfficial;
import election.ems_backend.views.mapper.CandidateCenterStatsOfficialMapper;
import election.ems_backend.views.repo.CandidateCenterStatsOfficialRepository;
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
 * Service for v_candidate_center_stats_official.
 */
@Service
@RequiredArgsConstructor
public class CandidateCenterStatsOfficialService {

    private static final Logger log = LoggerFactory.getLogger(CandidateCenterStatsOfficialService.class);

    private final CandidateCenterStatsOfficialRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;
    private final CandidateCenterStatsOfficialMapper mapper = new CandidateCenterStatsOfficialMapper();


    @Transactional(readOnly = true)
    @Cacheable(value = "candidateCenterStatsOfficial", key = "T(java.lang.String).valueOf(#electionId) + ':' + (#countyId==null?'':#countyId) + ':' + (#districtId==null?'':#districtId) + ':' + (#centerId==null?'':#centerId) + ':' + (#candidateId==null?'':#candidateId) + ':' + (#partyId==null?'':#partyId) + ':' + #pageable.pageNumber + ':' + #pageable.pageSize + ':' + #pageable.sort")
    public Page<CandidateCenterStatsOfficialDto> listCandidateCenterOfficialStats(UUID electionId, UUID countyId, UUID districtId, UUID centerId, UUID candidateId, UUID partyId, Pageable pageable) {
        log.debug("listCandidateCenterOfficialStats called electionId={} countyId={} districtId={} centerId={} candidateId={} partyId={} page={} size={}",
                electionId, countyId, districtId, centerId, candidateId, partyId, pageable.getPageNumber(), pageable.getPageSize());

        if (electionId == null) throw new IllegalArgumentException("electionId is required");
        electionValidationService.ensureExists(electionId);

        // apply tenant GUCs if present in security context (cast null to disambiguate overload)
        UUID derivedOrgId = SecurityUtils.getOrgIdFromContext();
        if (derivedOrgId != null) {
            tenantGucService.applyForTransaction(derivedOrgId, false, false);
        } else {
            tenantGucService.applyForTransaction((java.util.UUID) null, false, false);
        }

        Specification<CandidateCenterStatsOfficial> spec = Specification
                .where(CandidateCenterStatsOfficialSpecs.electionEquals(electionId))
                .and(CandidateCenterStatsOfficialSpecs.countyEquals(countyId))
                .and(CandidateCenterStatsOfficialSpecs.districtEquals(districtId))
                .and(CandidateCenterStatsOfficialSpecs.centerEquals(centerId))
                .and(CandidateCenterStatsOfficialSpecs.candidateEquals(candidateId))
                .and(CandidateCenterStatsOfficialSpecs.partyEquals(partyId));

        Page<CandidateCenterStatsOfficial> page = repo.findAll(spec, pageable);

        meterRegistry.gauge("api.stats.official.candidate_center.result_size", page.getContent(), c -> (double) c.size());
        return page.map(mapper::toDto);
    }
}