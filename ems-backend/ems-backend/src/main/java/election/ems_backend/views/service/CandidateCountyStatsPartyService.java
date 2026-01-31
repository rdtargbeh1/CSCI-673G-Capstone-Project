package election.ems_backend.views.service;

import election.ems_backend.views.CandidateCountyStatsPartySpecs;
import election.ems_backend.views.dto.CandidateCountyStatsPartyDto;
import election.ems_backend.views.entity.CandidateCountyStatsParty;
import election.ems_backend.views.mapper.CandidateCountyStatsPartyMapper;
import election.ems_backend.views.repo.CandidateCountyStatsPartyRepository;
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
 * Production-ready service for v_candidate_county_stats_party.
 */
@Service
@RequiredArgsConstructor
public class CandidateCountyStatsPartyService{

    private static final Logger log = LoggerFactory.getLogger(CandidateCountyStatsPartyService.class);

    private final CandidateCountyStatsPartyRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;
    private final CandidateCountyStatsPartyMapper mapper = new CandidateCountyStatsPartyMapper();


    @Transactional(readOnly = true)
    @Cacheable(
            value = "candidateCountyStatsParty",
            key =
                    "T(java.lang.String).valueOf(#orgId) + ':' + #electionId"
                            + " + ':' + (#contestId==null?'':#contestId)"
                            + " + ':' + (#countyId==null?'':#countyId)"
                            + " + ':' + (#candidateId==null?'':#candidateId)"
                            + " + ':' + (#partyId==null?'':#partyId)"
                            + " + ':' + #pageable.pageNumber"
                            + " + ':' + #pageable.pageSize"
                            + " + ':' + #pageable.sort"
    )
    public Page<CandidateCountyStatsPartyDto> listCandidateCountyStats(
            UUID orgId,
            UUID electionId,
            UUID contestId,   // ✅ NEW
            UUID countyId,
            UUID candidateId,
            UUID partyId,
            Pageable pageable
    ) {
        if (orgId == null) throw new IllegalArgumentException("orgId is required");
        electionValidationService.ensureExists(electionId);

        tenantGucService.applyForTransaction(orgId, false, false);

        Specification<CandidateCountyStatsParty> spec = Specification
                .where(CandidateCountyStatsPartySpecs.orgEquals(orgId))
                .and(CandidateCountyStatsPartySpecs.electionEquals(electionId))
                .and(CandidateCountyStatsPartySpecs.contestEquals(contestId)) // ✅ NEW
                .and(CandidateCountyStatsPartySpecs.countyEquals(countyId))
                .and(CandidateCountyStatsPartySpecs.candidateEquals(candidateId))
                .and(CandidateCountyStatsPartySpecs.partyEquals(partyId));

        Page<CandidateCountyStatsParty> page = repo.findAll(spec, pageable);
        meterRegistry.gauge("api.stats.candidate_county.result_size", page.getContent(), c -> (double) c.size());
        return page.map(mapper::toDto);
    }

}