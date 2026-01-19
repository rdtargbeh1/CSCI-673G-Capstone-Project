package election.ems_backend.views.service;

import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.CandidateCountyStatsOfficialSpecs;
import election.ems_backend.views.dto.CandidateCountyStatsOfficialDto;
import election.ems_backend.views.entity.CandidateCountyStatsOfficial;
import election.ems_backend.views.mapper.CandidateCountyStatsOfficialMapper;
import election.ems_backend.views.repo.CandidateCountyStatsOfficialRepository;
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
 * Service for v_candidate_county_stats_official.
 */
@Service
@RequiredArgsConstructor
public class CandidateCountyStatsOfficialService {

    private static final Logger log = LoggerFactory.getLogger(CandidateCountyStatsOfficialService.class);

    private final CandidateCountyStatsOfficialRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;
    private final CandidateCountyStatsOfficialMapper mapper = new CandidateCountyStatsOfficialMapper();


    @Transactional(readOnly = true)
    @Cacheable(value = "candidateCountyStatsOfficial", key = "T(java.lang.String).valueOf(#electionId) + ':' + (#countyId==null?'':#countyId) + ':' + (#candidateId==null?'':#candidateId) + ':' + (#partyId==null?'':#partyId) + ':' + #pageable.pageNumber + ':' + #pageable.pageSize + ':' + #pageable.sort")
    public Page<CandidateCountyStatsOfficialDto> listCandidateCountyOfficialStats(UUID electionId, UUID countyId, UUID candidateId, UUID partyId, Pageable pageable) {
        log.debug("listCandidateCountyOfficialStats called electionId={} countyId={} candidateId={} partyId={} page={} size={}",
                electionId, countyId, candidateId, partyId, pageable.getPageNumber(), pageable.getPageSize());

        if (electionId == null) throw new IllegalArgumentException("electionId is required");
        electionValidationService.ensureExists(electionId);

        // apply tenant GUCs if present
        UUID derivedOrgId = SecurityUtils.getOrgIdFromContext();
        if (derivedOrgId != null) {
            tenantGucService.applyForTransaction(derivedOrgId, false, false);
        } else {
            tenantGucService.applyForTransaction((java.util.UUID) null, false, false);
        }

        Specification<CandidateCountyStatsOfficial> spec = Specification
                .where(CandidateCountyStatsOfficialSpecs.electionEquals(electionId))
                .and(CandidateCountyStatsOfficialSpecs.countyEquals(countyId))
                .and(CandidateCountyStatsOfficialSpecs.candidateEquals(candidateId))
                .and(CandidateCountyStatsOfficialSpecs.partyEquals(partyId));

        Page<CandidateCountyStatsOfficial> page = repo.findAll(spec, pageable);

        meterRegistry.gauge("api.stats.official.candidate_county.result_size", page.getContent(), c -> (double) c.size());
        return page.map(mapper::toDto);
    }
}