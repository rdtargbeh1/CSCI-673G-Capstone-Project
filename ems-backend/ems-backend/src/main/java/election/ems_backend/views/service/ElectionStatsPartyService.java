package election.ems_backend.views.service;

import election.ems_backend.views.ElectionStatsPartySpecs;
import election.ems_backend.views.dto.ElectionStatsPartyDto;
import election.ems_backend.views.entity.ElectionStatsParty;
import election.ems_backend.views.mapper.ElectionStatsPartyMapper;
import election.ems_backend.views.repo.ElectionStatsPartyRepository;
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
 * Production-ready service for election-level party stats.
 *
 * - Validates election existence via ElectionValidationService.
 * - Applies tenant GUCs before repository queries so RLS applies.
 * - Cacheable for short TTL to reduce load.
 * - Emits metrics and logs.
 */
@Service
@RequiredArgsConstructor
public class ElectionStatsPartyService {

    private static final Logger log = LoggerFactory.getLogger(ElectionStatsPartyService.class);

    private final ElectionStatsPartyRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;
    private final ElectionStatsPartyMapper mapper = new ElectionStatsPartyMapper();


    @Transactional(readOnly = true)
    @Cacheable(
            value = "electionStatsParty",
            key = "T(java.lang.String).valueOf(#orgId) + ':' + #electionId"
                    + " + ':' + (#contestId==null?'':#contestId)"
                    + " + ':' + #pageable.pageNumber + ':' + #pageable.pageSize + ':' + #pageable.sort"
    )
    public Page<ElectionStatsPartyDto> listElectionStats(
            UUID orgId,
            UUID electionId,
            UUID contestId,   // ✅ NEW
            Pageable pageable
    ) {
        log.debug("listElectionStats called orgId={} electionId={} contestId={} page={} size={}",
                orgId, electionId, contestId, pageable.getPageNumber(), pageable.getPageSize());

        if (orgId == null) throw new IllegalArgumentException("orgId is required");
        if (electionId == null) throw new IllegalArgumentException("electionId is required");

        electionValidationService.ensureExists(electionId);

        tenantGucService.applyForTransaction(orgId, false, false);

        Specification<ElectionStatsParty> spec = Specification
                .where(ElectionStatsPartySpecs.orgEquals(orgId))
                .and(ElectionStatsPartySpecs.electionEquals(electionId))
                .and(ElectionStatsPartySpecs.contestEquals(contestId)); // ✅ NEW

        Page<ElectionStatsParty> page = repo.findAll(spec, pageable);

        meterRegistry.gauge("api.stats.election.result_size", page.getContent(), c -> (double) c.size());

        return page.map(mapper::toDto);
    }


}
