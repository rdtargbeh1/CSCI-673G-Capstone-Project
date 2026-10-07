package election.ems_backend.views.service;

import election.ems_backend.enums.AssignmentScope;
import election.ems_backend.policy.OperationAccessPolicy;
import election.ems_backend.policy.OperationRolePolicy;
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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Production-ready service for v_election_stats_official.
 *
 * - Validates election existence
 * - Enforces operational election scope
 * - Caches responses for non-operational callers
 * - Emits metrics and logs
 *
 * contestId is optional:
 * - contestId == null => all contests
 */
@Service
@RequiredArgsConstructor
public class ElectionStatsOfficialService {

    private static final Logger log =
            LoggerFactory.getLogger(
                    ElectionStatsOfficialService.class
            );

    private final ElectionStatsOfficialRepository repo;
    private final ElectionValidationService electionValidationService;
    private final MeterRegistry meterRegistry;

    private final OperationRolePolicy operationRolePolicy;
    private final OperationAccessPolicy operationAccessPolicy;

    private final ElectionStatsOfficialMapper mapper =
            new ElectionStatsOfficialMapper();


    @Transactional(readOnly = true)
    @Cacheable(
            value = "electionStatsOfficial",
            key =
                    "T(java.lang.String).valueOf(#electionId)"
                            + " + ':' + (#contestId==null?'':#contestId)"
                            + " + ':' + #pageable.pageNumber"
                            + " + ':' + #pageable.pageSize"
                            + " + ':' + #pageable.sort",
            condition = "!@operationRolePolicy.isOperationalRole()"
    )
    public Page<ElectionStatsOfficialDto> listElectionStats(
            UUID electionId,
            UUID contestId,
            Pageable pageable
    ) {

        log.debug(
                "listElectionStats (official) called electionId={} " +
                        "contestId={} page={} size={}",
                electionId,
                contestId,
                pageable.getPageNumber(),
                pageable.getPageSize()
        );

        if (electionId == null) {
            throw new IllegalArgumentException(
                    "electionId is required"
            );
        }

        electionValidationService.ensureExists(
                electionId
        );


        /*
         * ElectionStatsOfficial is an ELECTION-level aggregate.
         *
         * ORGANIZATION
         *     -> allowed
         *
         * MULTI_COUNTY / COUNTY / DISTRICT / CENTER / PLACE
         *     -> denied because this result represents the whole election.
         */
        if (operationRolePolicy.isOperationalRole()) {

            if (!operationAccessPolicy.hasOperationalAccess(
                    electionId
            )) {

                throw new AccessDeniedException(
                        "User does not have operational access to this election"
                );
            }

            AssignmentScope scope =
                    operationAccessPolicy.currentScope(
                            electionId
                    );

            if (scope == null) {

                throw new AccessDeniedException(
                        "User has no active election assignment scope"
                );
            }

            if (scope != AssignmentScope.ORGANIZATION) {

                throw new AccessDeniedException(
                        "Election-level aggregate results require ORGANIZATION scope"
                );
            }
        }


        Specification<ElectionStatsOfficial> spec =
                Specification
                        .where(
                                ElectionStatsOfficialSpecs
                                        .electionEquals(
                                                electionId
                                        )
                        )
                        .and(
                                ElectionStatsOfficialSpecs
                                        .contestEquals(
                                                contestId
                                        )
                        );


        Page<ElectionStatsOfficial> page =
                repo.findAll(
                        spec,
                        pageable
                );


        meterRegistry.gauge(
                "api.stats.official.election.result_size",
                page.getContent(),
                content -> (double) content.size()
        );


        return page.map(
                mapper::toDto
        );
    }
}