package election.ems_backend.views.service;

import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.CandidateElectionStatsOfficialSpecs;
import election.ems_backend.views.dto.CandidateElectionStatsOfficialDto;
import election.ems_backend.views.entity.CandidateElectionStatsOfficial;
import election.ems_backend.views.mapper.CandidateElectionStatsOfficialMapper;
import election.ems_backend.views.repo.CandidateElectionStatsOfficialRepository;
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
 * Service for v_candidate_election_stats_official.
 */
@Service
@RequiredArgsConstructor
public class CandidateElectionStatsOfficialService {

    private static final Logger log = LoggerFactory.getLogger(CandidateElectionStatsOfficialService.class);

    private final CandidateElectionStatsOfficialRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;
    private final CandidateElectionStatsOfficialMapper mapper = new CandidateElectionStatsOfficialMapper();


    @Transactional(readOnly = true)
    @Cacheable(
            value = "candidateElectionStatsOfficial",
            key =
                    "T(java.lang.String).valueOf(#electionId) + ':'"
                            + " + (#contestId==null?'':#contestId) + ':'"
                            + " + (#candidateId==null?'':#candidateId) + ':'"
                            + " + (#partyId==null?'':#partyId) + ':'"
                            + " + #pageable.pageNumber + ':' + #pageable.pageSize + ':' + #pageable.sort"
    )
    public Page<CandidateElectionStatsOfficialDto> listCandidateElectionOfficialStats(
            UUID electionId,
            UUID contestId,     // ✅ NEW
            UUID candidateId,
            UUID partyId,
            Pageable pageable
    ) {
        if (electionId == null) throw new IllegalArgumentException("electionId is required");
        electionValidationService.ensureExists(electionId);

        UUID derivedOrgId = SecurityUtils.getOrgIdFromContext();
        if (derivedOrgId != null) {
            tenantGucService.applyForTransaction(derivedOrgId, false, false);
        } else {
            tenantGucService.applyForTransaction((UUID) null, false, false);
        }

        Specification<CandidateElectionStatsOfficial> spec = Specification
                .where(CandidateElectionStatsOfficialSpecs.electionEquals(electionId))
                .and(CandidateElectionStatsOfficialSpecs.contestEquals(contestId))  // ✅ NEW
                .and(CandidateElectionStatsOfficialSpecs.candidateEquals(candidateId))
                .and(CandidateElectionStatsOfficialSpecs.partyEquals(partyId));

        Page<CandidateElectionStatsOfficial> page = repo.findAll(spec, pageable);

        meterRegistry.gauge("api.stats.official.candidate_election.result_size", page.getContent(), c -> (double) c.size());
        return page.map(mapper::toDto);
    }


}