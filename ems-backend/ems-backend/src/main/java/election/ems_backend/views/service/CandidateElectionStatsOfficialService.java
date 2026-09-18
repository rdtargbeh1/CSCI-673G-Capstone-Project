package election.ems_backend.views.service;

import election.ems_backend.enums.AssignmentScope;
import election.ems_backend.policy.OperationAccessPolicy;
import election.ems_backend.policy.OperationRolePolicy;
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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Service for v_candidate_election_stats_official.
 */
@Service
@RequiredArgsConstructor
public class CandidateElectionStatsOfficialService {

    private static final Logger log =
            LoggerFactory.getLogger(
                    CandidateElectionStatsOfficialService.class
            );

    private final CandidateElectionStatsOfficialRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;

    private final OperationRolePolicy operationRolePolicy;
    private final OperationAccessPolicy operationAccessPolicy;

    private final CandidateElectionStatsOfficialMapper mapper =
            new CandidateElectionStatsOfficialMapper();


    @Transactional(readOnly = true)
    @Cacheable(
            value = "candidateElectionStatsOfficial",
            key =
                    "T(java.lang.String).valueOf(#electionId) + ':'"
                            + " + (#contestId==null?'':#contestId) + ':'"
                            + " + (#candidateId==null?'':#candidateId) + ':'"
                            + " + (#partyId==null?'':#partyId) + ':'"
                            + " + #pageable.pageNumber + ':'"
                            + " + #pageable.pageSize + ':'"
                            + " + #pageable.sort",
            condition = "!@operationRolePolicy.isOperationalRole()"
    )
    public Page<CandidateElectionStatsOfficialDto> listCandidateElectionOfficialStats(
            UUID electionId,
            UUID contestId,
            UUID candidateId,
            UUID partyId,
            Pageable pageable
    ) {

        log.debug(
                "listCandidateElectionOfficialStats called " +
                        "electionId={} contestId={} candidateId={} " +
                        "partyId={} page={} size={}",
                electionId,
                contestId,
                candidateId,
                partyId,
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
         * Preserve existing tenant GUC behavior.
         */
        UUID derivedOrgId =
                SecurityUtils.getOrgIdFromContext();

        if (derivedOrgId != null) {

            tenantGucService.applyForTransaction(
                    derivedOrgId,
                    false,
                    false
            );

        } else {

            tenantGucService.applyForTransaction(
                    (UUID) null,
                    false,
                    false
            );
        }


        /*
         * Operational authorization.
         *
         * CandidateElectionStatsOfficial is an ELECTION-level aggregate.
         *
         * ORGANIZATION
         *     -> allowed
         *
         * MULTI_COUNTY / COUNTY / DISTRICT / CENTER / PLACE
         *     -> denied because this view contains election-wide totals
         *        and does not expose geography that can be safely scoped
         *        to a lower assignment boundary.
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


        Specification<CandidateElectionStatsOfficial> spec =
                Specification
                        .where(
                                CandidateElectionStatsOfficialSpecs
                                        .electionEquals(
                                                electionId
                                        )
                        )
                        .and(
                                CandidateElectionStatsOfficialSpecs
                                        .contestEquals(
                                                contestId
                                        )
                        )
                        .and(
                                CandidateElectionStatsOfficialSpecs
                                        .candidateEquals(
                                                candidateId
                                        )
                        )
                        .and(
                                CandidateElectionStatsOfficialSpecs
                                        .partyEquals(
                                                partyId
                                        )
                        );


        Page<CandidateElectionStatsOfficial> page =
                repo.findAll(
                        spec,
                        pageable
                );

        meterRegistry.gauge(
                "api.stats.official.candidate_election.result_size",
                page.getContent(),
                content -> (double) content.size()
        );

        return page.map(
                mapper::toDto
        );
    }
}