package election.ems_backend.views.service;

import election.ems_backend.views.CandidateDistrictStatsPartySpecs;
import election.ems_backend.views.dto.CandidateDistrictStatsPartyDto;
import election.ems_backend.views.entity.CandidateDistrictStatsParty;
import election.ems_backend.views.mapper.CandidateDistrictStatsPartyMapper;
import election.ems_backend.views.repo.CandidateDistrictStatsPartyRepository;
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
 * Production-ready service for v_candidate_district_stats_party.
 */
@Service
@RequiredArgsConstructor
public class CandidateDistrictStatsPartyService {

    private static final Logger log = LoggerFactory.getLogger(CandidateDistrictStatsPartyService.class);

    private final CandidateDistrictStatsPartyRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;
    private final CandidateDistrictStatsPartyMapper mapper = new CandidateDistrictStatsPartyMapper();


    @Transactional(readOnly = true)
    @Cacheable(
            value = "candidateDistrictStatsParty",
            key =
                    "T(java.lang.String).valueOf(#orgId) + ':' + #electionId"
                            + " + ':' + (#contestId==null?'':#contestId)"
                            + " + ':' + (#countyId==null?'':#countyId)"
                            + " + ':' + (#districtId==null?'':#districtId)"
                            + " + ':' + (#candidateId==null?'':#candidateId)"
                            + " + ':' + (#partyId==null?'':#partyId)"
                            + " + ':' + #pageable.pageNumber"
                            + " + ':' + #pageable.pageSize"
                            + " + ':' + #pageable.sort"
    )
    public Page<CandidateDistrictStatsPartyDto> listCandidateDistrictStats(
            UUID orgId,
            UUID electionId,
            UUID contestId,   // ✅ NEW
            UUID countyId,
            UUID districtId,
            UUID candidateId,
            UUID partyId,
            Pageable pageable
    ) {
        log.debug("listCandidateDistrictStats called orgId={} electionId={} contestId={} countyId={} districtId={} candidateId={} partyId={} page={} size={}",
                orgId, electionId, contestId, countyId, districtId, candidateId, partyId,
                pageable.getPageNumber(), pageable.getPageSize());

        if (orgId == null) throw new IllegalArgumentException("orgId is required");
        electionValidationService.ensureExists(electionId);

        tenantGucService.applyForTransaction(orgId, false, false);

        Specification<CandidateDistrictStatsParty> spec = Specification
                .where(CandidateDistrictStatsPartySpecs.orgEquals(orgId))
                .and(CandidateDistrictStatsPartySpecs.electionEquals(electionId))
                .and(CandidateDistrictStatsPartySpecs.contestEquals(contestId)) // ✅ NEW
                .and(CandidateDistrictStatsPartySpecs.countyEquals(countyId))
                .and(CandidateDistrictStatsPartySpecs.districtEquals(districtId))
                .and(CandidateDistrictStatsPartySpecs.candidateEquals(candidateId))
                .and(CandidateDistrictStatsPartySpecs.partyEquals(partyId));

        Page<CandidateDistrictStatsParty> page = repo.findAll(spec, pageable);
        meterRegistry.gauge("api.stats.candidate_district.result_size", page.getContent(), c -> (double) c.size());
        return page.map(mapper::toDto);
    }


}