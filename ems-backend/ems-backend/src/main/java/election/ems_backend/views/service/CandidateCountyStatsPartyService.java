package election.ems_backend.views.service;

import election.ems_backend.enums.AssignmentScope;
import election.ems_backend.policy.OperationAccessPolicy;
import election.ems_backend.policy.OperationRolePolicy;
import election.ems_backend.views.CandidateCountyStatsPartySpecs;
import election.ems_backend.views.dto.CandidateCountyStatsPartyDto;
import election.ems_backend.views.entity.CandidateCountyStatsParty;
import election.ems_backend.views.mapper.CandidateCountyStatsPartyMapper;
import election.ems_backend.views.repo.CandidateCountyStatsPartyRepository;
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
 * Production-ready service for v_candidate_county_stats_party.
 */
@Service
@RequiredArgsConstructor
public class CandidateCountyStatsPartyService {

    private static final Logger log =
            LoggerFactory.getLogger(
                    CandidateCountyStatsPartyService.class
            );

    private final CandidateCountyStatsPartyRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;

    private final OperationRolePolicy operationRolePolicy;
    private final OperationAccessPolicy operationAccessPolicy;

    private final CandidateCountyStatsPartyMapper mapper =
            new CandidateCountyStatsPartyMapper();


    @Transactional(readOnly = true)
    @Cacheable(
            value = "candidateCountyStatsParty",
            key =
                    "T(java.lang.String).valueOf(#orgId) + ':' + #electionId"
                            + " + ':' + (#contestId==null?'':#contestId)"
                            + " + ':' + (#countyId==null?'':#countyId)"
                            + " + ':' + (#candidateId==null?'':#candidateId)"
                            + " + ':' + (#partyId==null?'':#partyId)"
                            + " + ':' + #pageable.pageNumber"
                            + " + ':' + #pageable.pageSize"
                            + " + ':' + #pageable.sort",
            condition = "!@operationRolePolicy.isOperationalRole()"
    )
    public Page<CandidateCountyStatsPartyDto> listCandidateCountyStats(
            UUID orgId,
            UUID electionId,
            UUID contestId,
            UUID countyId,
            UUID candidateId,
            UUID partyId,
            Pageable pageable
    ) {

        log.debug(
                "listCandidateCountyStats called orgId={} electionId={} " +
                        "contestId={} countyId={} candidateId={} partyId={} " +
                        "page={} size={}",
                orgId,
                electionId,
                contestId,
                countyId,
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


        Specification<CandidateCountyStatsParty> spec =
                Specification
                        .where(
                                CandidateCountyStatsPartySpecs
                                        .orgEquals(
                                                orgId
                                        )
                        )
                        .and(
                                CandidateCountyStatsPartySpecs
                                        .electionEquals(
                                                electionId
                                        )
                        )
                        .and(
                                CandidateCountyStatsPartySpecs
                                        .contestEquals(
                                                contestId
                                        )
                        )
                        .and(
                                CandidateCountyStatsPartySpecs
                                        .countyEquals(
                                                countyId
                                        )
                        )
                        .and(
                                CandidateCountyStatsPartySpecs
                                        .candidateEquals(
                                                candidateId
                                        )
                        )
                        .and(
                                CandidateCountyStatsPartySpecs
                                        .partyEquals(
                                                partyId
                                        )
                        );


        /*
         * Operational authorization.
         *
         * CandidateCountyStatsParty is a COUNTY-level result view.
         *
         * ORGANIZATION
         *     -> all counties for the election/org
         *
         * MULTI_COUNTY
         *     -> assigned counties only
         *
         * COUNTY
         *     -> assigned county only
         *
         * DISTRICT / CENTER / PLACE
         *     -> denied because this aggregate includes data
         *        outside those lower assignment boundaries.
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

            switch (scope) {

                case ORGANIZATION -> {
                    /*
                     * Existing org + election filters are sufficient.
                     */
                }

                case MULTI_COUNTY, COUNTY ->
                        spec = spec.and(
                                CandidateCountyStatsPartySpecs
                                        .countyIn(
                                                operationAccessPolicy
                                                        .assignedCountyIds(
                                                                electionId
                                                        )
                                        )
                        );

                case DISTRICT, CENTER, PLACE ->
                        throw new AccessDeniedException(
                                "Current assignment scope cannot view county-level aggregate results"
                        );

                default ->
                        throw new AccessDeniedException(
                                "Unsupported operational scope for county-level results"
                        );
            }
        }


        Page<CandidateCountyStatsParty> page =
                repo.findAll(
                        spec,
                        pageable
                );

        meterRegistry.gauge(
                "api.stats.candidate_county.result_size",
                page.getContent(),
                content -> (double) content.size()
        );

        return page.map(
                mapper::toDto
        );
    }
}