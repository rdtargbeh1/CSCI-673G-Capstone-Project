package election.ems_backend.views.service;

import election.ems_backend.enums.AssignmentScope;
import election.ems_backend.policy.OperationAccessPolicy;
import election.ems_backend.policy.OperationRolePolicy;
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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Production-ready service for v_candidate_election_stats_party.
 */
@Service
@RequiredArgsConstructor
public class CandidateElectionStatsPartyService {

    private static final Logger log =
            LoggerFactory.getLogger(
                    CandidateElectionStatsPartyService.class
            );

    private final CandidateElectionStatsPartyRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;

    private final OperationRolePolicy operationRolePolicy;
    private final OperationAccessPolicy operationAccessPolicy;

    private final CandidateElectionStatsPartyMapper mapper =
            new CandidateElectionStatsPartyMapper();


    @Transactional(readOnly = true)
    @Cacheable(
            value = "candidateElectionStatsParty",
            key =
                    "T(java.lang.String).valueOf(#orgId) + ':' + #electionId"
                            + " + ':' + (#contestId==null?'':#contestId)"
                            + " + ':' + (#candidateId==null?'':#candidateId)"
                            + " + ':' + (#partyId==null?'':#partyId)"
                            + " + ':' + #pageable.pageNumber"
                            + " + ':' + #pageable.pageSize"
                            + " + ':' + #pageable.sort",
            condition = "!@operationRolePolicy.isOperationalRole()"
    )
    public Page<CandidateElectionStatsPartyDto> listCandidateElectionStats(
            UUID orgId,
            UUID electionId,
            UUID contestId,
            UUID candidateId,
            UUID partyId,
            Pageable pageable
    ) {

        log.debug(
                "listCandidateElectionStats called orgId={} electionId={} " +
                        "contestId={} candidateId={} partyId={} page={} size={}",
                orgId,
                electionId,
                contestId,
                candidateId,
                partyId,
                pageable.getPageNumber(),
                pageable.getPageSize()
        );

        if (orgId == null) {
            throw new IllegalArgumentException(
                    "orgId is required"
            );
        }

        if (electionId == null) {
            throw new IllegalArgumentException(
                    "electionId is required"
            );
        }

        electionValidationService.ensureExists(
                electionId
        );

        /*
         * Preserve existing tenant/RLS behavior.
         */
        tenantGucService.applyForTransaction(
                orgId,
                false,
                false
        );


        /*
         * Operational authorization.
         *
         * CandidateElectionStatsParty is an ELECTION-level aggregate.
         *
         * ORGANIZATION
         *     -> allowed
         *
         * MULTI_COUNTY / COUNTY / DISTRICT / CENTER / PLACE
         *     -> denied because this view contains election-wide totals
         *        and has no lower-level geography that can be safely
         *        filtered to the user's assignment.
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


        Specification<CandidateElectionStatsParty> spec =
                Specification
                        .where(
                                CandidateElectionStatsPartySpecs
                                        .orgEquals(
                                                orgId
                                        )
                        )
                        .and(
                                CandidateElectionStatsPartySpecs
                                        .electionEquals(
                                                electionId
                                        )
                        )
                        .and(
                                CandidateElectionStatsPartySpecs
                                        .contestEquals(
                                                contestId
                                        )
                        )
                        .and(
                                CandidateElectionStatsPartySpecs
                                        .candidateEquals(
                                                candidateId
                                        )
                        )
                        .and(
                                CandidateElectionStatsPartySpecs
                                        .partyEquals(
                                                partyId
                                        )
                        );


        Page<CandidateElectionStatsParty> page =
                repo.findAll(
                        spec,
                        pageable
                );

        meterRegistry.gauge(
                "api.stats.candidate_election.result_size",
                page.getContent(),
                content -> (double) content.size()
        );

        return page.map(
                mapper::toDto
        );
    }
}