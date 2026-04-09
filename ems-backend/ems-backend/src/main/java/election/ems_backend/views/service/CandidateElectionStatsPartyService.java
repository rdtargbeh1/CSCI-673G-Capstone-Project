package election.ems_backend.views.service;

import election.ems_backend.views.CandidateElectionStatsPartySpecs;
import election.ems_backend.views.dto.CandidateElectionStatsPartyDto;
import election.ems_backend.views.entity.CandidateElectionStatsParty;
import election.ems_backend.views.mapper.CandidateElectionStatsPartyMapper;
import election.ems_backend.views.repo.CandidateElectionStatsPartyRepository;
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
 * Production-ready service for v_candidate_election_stats_party.
 */
@Service
@RequiredArgsConstructor
public class CandidateElectionStatsPartyService{

    private static final Logger log = LoggerFactory.getLogger(CandidateElectionStatsPartyService.class);

    private final CandidateElectionStatsPartyRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;
    private final CandidateElectionStatsPartyMapper mapper = new CandidateElectionStatsPartyMapper();


    @Transactional(readOnly = true)
    @Cacheable(value = "candidateElectionStatsParty", key = "T(java.lang.String).valueOf(#orgId) + ':' + #electionId + ':' + (#candidateId==null?'':#candidateId) + ':' + (#partyId==null?'':#partyId) + ':' + #pageable.pageNumber + ':' + #pageable.pageSize + ':' + #pageable.sort")
    public Page<CandidateElectionStatsPartyDto> listCandidateElectionStats(UUID orgId, UUID electionId, UUID candidateId, UUID partyId, Pageable pageable) {
        log.debug("listCandidateElectionStats called orgId={} electionId={} candidateId={} partyId={} page={} size={}",
                orgId, electionId, candidateId, partyId, pageable.getPageNumber(), pageable.getPageSize());

        if (orgId == null) throw new IllegalArgumentException("orgId is required");
        electionValidationService.ensureExists(electionId);

        tenantGucService.applyForTransaction(orgId, false, false);

        Specification<CandidateElectionStatsParty> spec = Specification
                .where(CandidateElectionStatsPartySpecs.orgEquals(orgId))
                .and(CandidateElectionStatsPartySpecs.electionEquals(electionId))
                .and(CandidateElectionStatsPartySpecs.candidateEquals(candidateId))
                .and(CandidateElectionStatsPartySpecs.partyEquals(partyId));

        Page<CandidateElectionStatsParty> page = repo.findAll(spec, pageable);

        meterRegistry.gauge("api.stats.candidate_election.result_size", page.getContent(), c -> (double) c.size());
        return page.map(mapper::toDto);
    }
}