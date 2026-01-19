package election.ems_backend.views.service;

import election.ems_backend.views.CandidateCenterStatsPartySpecs;
import election.ems_backend.views.dto.CandidateCenterStatsPartyDto;
import election.ems_backend.views.entity.CandidateCenterStatsParty;
import election.ems_backend.views.mapper.CandidateCenterStatsPartyMapper;
import election.ems_backend.views.repo.CandidateCenterStatsPartyRepository;
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
 * Production-ready service for v_candidate_center_stats_party.
 * - Validates election existence via centralized service
 * - Applies tenant GUCs inside transaction so RLS policies apply
 * - Cacheable (short TTL), metrics and logging
 */
@Service
@RequiredArgsConstructor
public class CandidateCenterStatsPartyService {

    private static final Logger log = LoggerFactory.getLogger(CandidateCenterStatsPartyService.class);

    private final CandidateCenterStatsPartyRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;
    private final CandidateCenterStatsPartyMapper mapper = new CandidateCenterStatsPartyMapper();


    @Transactional(readOnly = true)
    @Cacheable(value = "candidateCenterStatsParty", key = "T(java.lang.String).valueOf(#orgId) + ':' + #electionId + ':' + (#countyId==null?'':#countyId) + ':' + (#districtId==null?'':#districtId) + ':' + (#centerId==null?'':#centerId) + ':' + (#candidateId==null?'':#candidateId) + ':' + (#partyId==null?'':#partyId) + ':' + #pageable.pageNumber + ':' + #pageable.pageSize + ':' + #pageable.sort")
    public Page<CandidateCenterStatsPartyDto> listCandidateCenterStats(UUID orgId, UUID electionId, UUID countyId, UUID districtId, UUID centerId, UUID candidateId, UUID partyId, Pageable pageable) {
        log.debug("listCandidateCenterStats called orgId={} electionId={} countyId={} districtId={} centerId={} candidateId={} partyId={} page={} size={}",
                orgId, electionId, countyId, districtId, centerId, candidateId, partyId, pageable.getPageNumber(), pageable.getPageSize());

        if (orgId == null) throw new IllegalArgumentException("orgId is required");
        electionValidationService.ensureExists(electionId);

        // ensure RLS filters by tenant
        tenantGucService.applyForTransaction(orgId, false, false);

        Specification<CandidateCenterStatsParty> spec = Specification
                .where(CandidateCenterStatsPartySpecs.orgEquals(orgId))
                .and(CandidateCenterStatsPartySpecs.electionEquals(electionId))
                .and(CandidateCenterStatsPartySpecs.countyEquals(countyId))
                .and(CandidateCenterStatsPartySpecs.districtEquals(districtId))
                .and(CandidateCenterStatsPartySpecs.centerEquals(centerId))
                .and(CandidateCenterStatsPartySpecs.candidateEquals(candidateId))
                .and(CandidateCenterStatsPartySpecs.partyEquals(partyId));

        Page<CandidateCenterStatsParty> page = repo.findAll(spec, pageable);

        meterRegistry.gauge("api.stats.candidate_center.result_size", page.getContent(), c -> (double) c.size());
        return page.map(mapper::toDto);
    }
}