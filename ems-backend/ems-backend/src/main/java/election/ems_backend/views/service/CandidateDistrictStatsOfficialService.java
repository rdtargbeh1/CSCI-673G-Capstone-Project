package election.ems_backend.views.service;

import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.CandidateDistrictStatsOfficialSpecs;
import election.ems_backend.views.dto.CandidateDistrictStatsOfficialDto;
import election.ems_backend.views.entity.CandidateDistrictStatsOfficial;
import election.ems_backend.views.mapper.CandidateDistrictStatsOfficialMapper;
import election.ems_backend.views.repo.CandidateDistrictStatsOfficialRepository;
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
 * Service for v_candidate_district_stats_official.
 */
@Service
@RequiredArgsConstructor
public class CandidateDistrictStatsOfficialService {

    private static final Logger log = LoggerFactory.getLogger(CandidateDistrictStatsOfficialService.class);

    private final CandidateDistrictStatsOfficialRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;
    private final CandidateDistrictStatsOfficialMapper mapper = new CandidateDistrictStatsOfficialMapper();


    @Transactional(readOnly = true)
    @Cacheable(
            value = "candidateDistrictStatsOfficial",
            key =
                    "T(java.lang.String).valueOf(#electionId)"
                            + " + ':' + (#contestId==null ? '' : #contestId)"
                            + " + ':' + (#countyId==null ? '' : #countyId)"
                            + " + ':' + (#districtId==null ? '' : #districtId)"
                            + " + ':' + (#candidateId==null ? '' : #candidateId)"
                            + " + ':' + (#partyId==null ? '' : #partyId)"
                            + " + ':' + #pageable.pageNumber"
                            + " + ':' + #pageable.pageSize"
                            + " + ':' + #pageable.sort"
    )
    public Page<CandidateDistrictStatsOfficialDto> listCandidateDistrictOfficialStats(
            UUID electionId,
            UUID contestId,   // ✅ NEW
            UUID countyId,
            UUID districtId,
            UUID candidateId,
            UUID partyId,
            Pageable pageable
    ) {
        log.debug("listCandidateDistrictOfficialStats called electionId={} contestId={} countyId={} districtId={} candidateId={} partyId={} page={} size={}",
                electionId, contestId, countyId, districtId, candidateId, partyId, pageable.getPageNumber(), pageable.getPageSize());

        if (electionId == null) throw new IllegalArgumentException("electionId is required");
        electionValidationService.ensureExists(electionId);

        // apply tenant GUC if caller has org context (cast null to disambiguate overload)
        UUID derivedOrgId = SecurityUtils.getOrgIdFromContext();
        if (derivedOrgId != null) {
            tenantGucService.applyForTransaction(derivedOrgId, false, false);
        } else {
            tenantGucService.applyForTransaction((java.util.UUID) null, false, false);
        }

        Specification<CandidateDistrictStatsOfficial> spec = Specification
                .where(CandidateDistrictStatsOfficialSpecs.electionEquals(electionId))
                .and(CandidateDistrictStatsOfficialSpecs.contestEquals(contestId))   // ✅ NEW
                .and(CandidateDistrictStatsOfficialSpecs.countyEquals(countyId))
                .and(CandidateDistrictStatsOfficialSpecs.districtEquals(districtId))
                .and(CandidateDistrictStatsOfficialSpecs.candidateEquals(candidateId))
                .and(CandidateDistrictStatsOfficialSpecs.partyEquals(partyId));

        Page<CandidateDistrictStatsOfficial> page = repo.findAll(spec, pageable);

        meterRegistry.gauge("api.stats.official.candidate_district.result_size", page.getContent(), c -> (double) c.size());
        return page.map(mapper::toDto);
    }


}