package election.ems_backend.views.service;

import election.ems_backend.enums.AssignmentScope;
import election.ems_backend.policy.OperationAccessPolicy;
import election.ems_backend.policy.OperationRolePolicy;
import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.CountyStatsPartySpecs;
import election.ems_backend.views.dto.CountyStatsPartyDto;
import election.ems_backend.views.entity.CountyStatsParty;
import election.ems_backend.views.mapper.CountyStatsPartyMapper;
import election.ems_backend.views.repo.CountyStatsPartyRepository;
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
 * Production-ready service for county-level party stats.
 *
 * - Validates election existence.
 * - Applies tenant GUCs before queries.
 * - Enforces operational assignment scope.
 * - contestId is optional.
 */
@Service
@RequiredArgsConstructor
public class CountyStatsPartyService {

    private static final Logger log =
            LoggerFactory.getLogger(
                    CountyStatsPartyService.class
            );

    private final CountyStatsPartyRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;

    private final OperationRolePolicy operationRolePolicy;
    private final OperationAccessPolicy operationAccessPolicy;

    private final CountyStatsPartyMapper mapper =
            new CountyStatsPartyMapper();


    @Transactional(readOnly = true)
    @Cacheable(
            value = "countyStatsParty",
            key =
                    "T(java.lang.String).valueOf(#orgId) + ':' + #electionId"
                            + " + ':' + (#contestId==null?'':#contestId)"
                            + " + ':' + (#countyId==null?'':#countyId)"
                            + " + ':' + #pageable.pageNumber"
                            + " + ':' + #pageable.pageSize"
                            + " + ':' + #pageable.sort",
            condition = "!@operationRolePolicy.isOperationalRole()"
    )
    public Page<CountyStatsPartyDto> listCountyStats(
            UUID orgId,
            UUID electionId,
            UUID contestId,
            UUID countyId,
            Pageable pageable
    ) {

        log.debug(
                "listCountyStats called orgId={} electionId={} " +
                        "contestId={} countyId={} page={} size={}",
                orgId,
                electionId,
                contestId,
                countyId,
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
         * Operational callers must remain inside the authenticated
         * organization boundary.
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


        Specification<CountyStatsParty> spec =
                Specification
                        .where(
                                CountyStatsPartySpecs
                                        .orgEquals(
                                                orgId
                                        )
                        )
                        .and(
                                CountyStatsPartySpecs
                                        .electionEquals(
                                                electionId
                                        )
                        )
                        .and(
                                CountyStatsPartySpecs
                                        .contestEquals(
                                                contestId
                                        )
                        )
                        .and(
                                CountyStatsPartySpecs
                                        .countyEquals(
                                                countyId
                                        )
                        );


        /*
         * Operational authorization.
         *
         * CountyStatsParty is a COUNTY-level aggregate.
         *
         * ORGANIZATION
         *     -> all counties for the organization/election
         *
         * MULTI_COUNTY / COUNTY
         *     -> assigned county/counties
         *
         * DISTRICT / CENTER / PLACE
         *     -> denied because a county aggregate contains
         *        data outside those lower assignment boundaries
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
                                CountyStatsPartySpecs
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


        Page<CountyStatsParty> page =
                repo.findAll(
                        spec,
                        pageable
                );

        meterRegistry.gauge(
                "api.stats.county.result_size",
                page.getContent(),
                content -> (double) content.size()
        );

        return page.map(
                mapper::toDto
        );
    }
}