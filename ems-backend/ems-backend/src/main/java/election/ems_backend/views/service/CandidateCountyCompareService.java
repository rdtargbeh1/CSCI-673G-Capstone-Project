package election.ems_backend.views.service;

import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.CandidateCountyCompareSpecs;
import election.ems_backend.views.dto.CandidateCountyCompareDto;
import election.ems_backend.views.entity.CandidateCountyCompare;
import election.ems_backend.views.mapper.CandidateCountyCompareMapper;
import election.ems_backend.views.repo.CandidateCountyCompareRepository;
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
 * Service for v_candidate_county_compare.
 */
@Service
@RequiredArgsConstructor
public class CandidateCountyCompareService {

    private static final Logger log = LoggerFactory.getLogger(CandidateCountyCompareService.class);

    private final CandidateCountyCompareRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;
    private final CandidateCountyCompareMapper mapper = new CandidateCountyCompareMapper();


    @Transactional(readOnly = true)
    @Cacheable(value = "candidateCountyCompare", key = "T(java.lang.String).valueOf(#electionId) + ':' + (#countyId==null?'':#countyId) + ':' + (#candidateId==null?'':#candidateId) + ':' + (#orgId==null?'':#orgId) + ':' + (#partyId==null?'':#partyId) + ':' + #pageable.pageNumber + ':' + #pageable.pageSize + ':' + #pageable.sort")
    public Page<CandidateCountyCompareDto> listCandidateCountyCompare(UUID electionId, UUID countyId, UUID candidateId, UUID orgId, UUID partyId, Pageable pageable) {
        log.debug("listCandidateCountyCompare called electionId={} countyId={} candidateId={} orgId={} partyId={} page={} size={}",
                electionId, countyId, candidateId, orgId, partyId, pageable.getPageNumber(), pageable.getPageSize());

        if (electionId == null) throw new IllegalArgumentException("electionId is required");
        electionValidationService.ensureExists(electionId);

        // apply tenant guc if caller has org context; not strictly required for this view but keeps RLS consistent
        UUID derivedOrgId = SecurityUtils.getOrgIdFromContext();
        if (derivedOrgId != null) {
            tenantGucService.applyForTransaction(derivedOrgId, false, false);
        } else {
            tenantGucService.applyForTransaction((java.util.UUID) null, false, false);
        }

        Specification<CandidateCountyCompare> spec = Specification
                .where(CandidateCountyCompareSpecs.electionEquals(electionId))
                .and(CandidateCountyCompareSpecs.countyEquals(countyId))
                .and(CandidateCountyCompareSpecs.candidateEquals(candidateId))
                .and(CandidateCountyCompareSpecs.orgEquals(orgId))
                .and(CandidateCountyCompareSpecs.partyEquals(partyId));

        Page<CandidateCountyCompare> page = repo.findAll(spec, pageable);

        meterRegistry.gauge("api.stats.compare.candidate_county.result_size", page.getContent(), c -> (double) c.size());
        return page.map(mapper::toDto);
    }
}