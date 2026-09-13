
package election.ems_backend.views.service;

import election.ems_backend.views.ElectionStatsOfficialSpecs;
import election.ems_backend.views.dto.ElectionStatsOfficialDto;
import election.ems_backend.views.entity.ElectionStatsOfficial;
import election.ems_backend.views.mapper.ElectionStatsOfficialMapper;
import election.ems_backend.views.repo.ElectionStatsOfficialRepository;
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
 * Production-ready service for v_election_stats_official.
 *
 * - Validates election existence
 * - Caches responses for short TTL
 * - Emits metrics and logs
 *
 * NOTE: contestId is OPTIONAL:
 * - contestId == null => return rows for ALL contests (no contest filter applied)
 */
@Service
@RequiredArgsConstructor
public class ElectionStatsOfficialService {

    private static final Logger log = LoggerFactory.getLogger(ElectionStatsOfficialService.class);

    private final ElectionStatsOfficialRepository repo;
    private final ElectionValidationService electionValidationService;
    private final MeterRegistry meterRegistry;
    private final ElectionStatsOfficialMapper mapper = new ElectionStatsOfficialMapper();

    @Transactional(readOnly = true)
    @Cacheable(
            value = "electionStatsOfficial",
            key = "T(java.lang.String).valueOf(#electionId)"
                    + " + ':' + (#contestId==null?'':#contestId)"
                    + " + ':' + #pageable.pageNumber + ':' + #pageable.pageSize + ':' + #pageable.sort"
    )
    public Page<ElectionStatsOfficialDto> listElectionStats(
            UUID electionId,
            UUID contestId,   // ✅ OPTIONAL now
            Pageable pageable
    ) {
        log.debug("listElectionStats (official) called electionId={} contestId={} page={} size={}",
                electionId, contestId, pageable.getPageNumber(), pageable.getPageSize());

        if (electionId == null) throw new IllegalArgumentException("electionId is required");
        // ✅ contestId is OPTIONAL

        electionValidationService.ensureExists(electionId);

        Specification<ElectionStatsOfficial> spec = Specification
                .where(ElectionStatsOfficialSpecs.electionEquals(electionId))
                // ✅ contest filter applied ONLY if contestId != null
                .and(ElectionStatsOfficialSpecs.contestEquals(contestId));

        Page<ElectionStatsOfficial> page = repo.findAll(spec, pageable);

        meterRegistry.gauge("api.stats.official.election.result_size", page.getContent(), c -> (double) c.size());

        return page.map(mapper::toDto);
    }
}
