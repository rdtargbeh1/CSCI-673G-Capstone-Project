package election.ems_backend.views.service;

import election.ems_backend.enums.AssignmentScope;
import election.ems_backend.policy.OperationAccessPolicy;
import election.ems_backend.policy.OperationRolePolicy;
import election.ems_backend.utility.SecurityUtils;
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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Production-ready service for election-level party stats.
 *
 * - Validates election existence via ElectionValidationService.
 * - Applies tenant GUCs before repository queries so RLS applies.
 * - Enforces operational organization/election scope.
 * - Cacheable for non-operational callers.
 * - Emits metrics and logs.
 *
 * contestId is optional:
 * - contestId == null => return rows for ALL contests.
 */
@Service
@RequiredArgsConstructor
public class ElectionStatsPartyService {

    private static final Logger log =
            LoggerFactory.getLogger(
                    ElectionStatsPartyService.class
            );

    private final ElectionStatsPartyRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;

    private final OperationRolePolicy operationRolePolicy;
    private final OperationAccessPolicy operationAccessPolicy;

    private final ElectionStatsPartyMapper mapper =
            new ElectionStatsPartyMapper();


    @Transactional(readOnly = true)
    @Cacheable(
            value = "electionStatsParty",
            key =
                    "T(java.lang.String).valueOf(#orgId) + ':' + #electionId"
                            + " + ':' + (#contestId==null?'':#contestId)"
                            + " + ':' + #pageable.pageNumber"
                            + " + ':' + #pageable.pageSize"
                            + " + ':' + #pageable.sort",
            condition = "!@operationRolePolicy.isOperationalRole()"
    )
    public Page<ElectionStatsPartyDto> listElectionStats(
            UUID orgId,
            UUID electionId,
            UUID contestId,
            Pageable pageable
    ) {

        log.debug(
                "listElectionStats called orgId={} electionId={} " +
                        "contestId={} page={} size={}",
                orgId,
                electionId,
                contestId,
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
         * Operational users cannot query another tenant's data.
         */
        if (operationRolePolicy.isOperationalRole()) {

            UUID derivedOrgId =
                    SecurityUtils.getOrgIdFromContext();

            if (derivedOrgId == null) {

                throw new AccessDeniedException(
                        "Operational result access requires an organization context"
                );
            }

            if (!derivedOrgId.equals(orgId)) {

                throw new AccessDeniedException(
                        "Requested organization does not match the authenticated organization"
                );
            }
        }


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
         * ElectionStatsParty is an ELECTION-level aggregate.
         *
         * ORGANIZATION
         *     -> allowed
         *
         * MULTI_COUNTY / COUNTY / DISTRICT / CENTER / PLACE
         *     -> denied because this view contains election-wide totals
         *        and has no lower-level geography for safe filtering.
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


        Specification<ElectionStatsParty> spec =
                Specification
                        .where(
                                ElectionStatsPartySpecs
                                        .orgEquals(
                                                orgId
                                        )
                        )
                        .and(
                                ElectionStatsPartySpecs
                                        .electionEquals(
                                                electionId
                                        )
                        )
                        .and(
                                ElectionStatsPartySpecs
                                        .contestEquals(
                                                contestId
                                        )
                        );


        Page<ElectionStatsParty> page =
                repo.findAll(
                        spec,
                        pageable
                );


        meterRegistry.gauge(
                "api.stats.election.result_size",
                page.getContent(),
                content -> (double) content.size()
        );


        return page.map(
                mapper::toDto
        );
    }
}