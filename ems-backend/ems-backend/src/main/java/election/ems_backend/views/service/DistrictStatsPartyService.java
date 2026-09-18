package election.ems_backend.views.service;

import election.ems_backend.enums.AssignmentScope;
import election.ems_backend.policy.OperationAccessPolicy;
import election.ems_backend.policy.OperationRolePolicy;
import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.DistrictStatsPartySpecs;
import election.ems_backend.views.dto.DistrictStatsPartyDto;
import election.ems_backend.views.entity.DistrictStatsParty;
import election.ems_backend.views.mapper.DistrictStatsPartyMapper;
import election.ems_backend.views.repo.DistrictStatsPartyRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PostConstruct;
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
 * Service implementation that:
 * - validates election existence
 * - applies tenant GUCs for RLS
 * - enforces operational geographic assignment scope
 * - queries the view via specifications
 * - maps to DTO
 */
@Service
@RequiredArgsConstructor
public class DistrictStatsPartyService {

    private static final Logger log =
            LoggerFactory.getLogger(
                    DistrictStatsPartyService.class
            );

    private final DistrictStatsPartyRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;

    private final OperationRolePolicy operationRolePolicy;
    private final OperationAccessPolicy operationAccessPolicy;

    private final DistrictStatsPartyMapper mapper =
            new DistrictStatsPartyMapper();

    private Counter requestCounter;


    @PostConstruct
    void initMetrics() {

        this.requestCounter =
                Counter.builder(
                                "api.stats.districts.requests"
                        )
                        .description(
                                "Requests for district stats"
                        )
                        .register(
                                meterRegistry
                        );
    }


    @Transactional(readOnly = true)
    @Cacheable(
            value = "districtStatsParty",
            key =
                    "T(java.lang.String).valueOf(#orgId)"
                            + " + ':' + #electionId"
                            + " + ':' + (#contestId==null?'':#contestId)"
                            + " + ':' + (#countyId==null?'':#countyId)"
                            + " + ':' + (#districtId==null?'':#districtId)"
                            + " + ':' + #pageable.pageNumber"
                            + " + ':' + #pageable.pageSize"
                            + " + ':' + #pageable.sort",
            condition = "!@operationRolePolicy.isOperationalRole()"
    )
    public Page<DistrictStatsPartyDto> listDistrictStats(
            UUID orgId,
            UUID electionId,
            UUID contestId,
            UUID countyId,
            UUID districtId,
            Pageable pageable
    ) {

        requestCounter.increment();


        log.debug(
                "listDistrictStats called orgId={} electionId={} contestId={} " +
                        "countyId={} districtId={} page={} size={}",
                orgId,
                electionId,
                contestId,
                countyId,
                districtId,
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
         * Operational callers cannot query another tenant's data.
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
         * Apply tenant GUC before repository queries.
         */
        tenantGucService.applyForTransaction(
                orgId,
                false,
                false
        );


        Specification<DistrictStatsParty> spec =
                Specification
                        .where(
                                DistrictStatsPartySpecs
                                        .orgEquals(
                                                orgId
                                        )
                        )
                        .and(
                                DistrictStatsPartySpecs
                                        .electionEquals(
                                                electionId
                                        )
                        )
                        .and(
                                DistrictStatsPartySpecs
                                        .contestEquals(
                                                contestId
                                        )
                        )
                        .and(
                                DistrictStatsPartySpecs
                                        .countyEquals(
                                                countyId
                                        )
                        )
                        .and(
                                DistrictStatsPartySpecs
                                        .districtEquals(
                                                districtId
                                        )
                        );


        /*
         * Operational authorization.
         *
         * ORGANIZATION
         *     -> all districts for the org/election
         *
         * MULTI_COUNTY / COUNTY
         *     -> districts inside assigned counties
         *
         * DISTRICT
         *     -> assigned district(s)
         *
         * CENTER / PLACE
         *     -> denied because this is a district aggregate
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
                                DistrictStatsPartySpecs
                                        .countyIn(
                                                operationAccessPolicy
                                                        .assignedCountyIds(
                                                                electionId
                                                        )
                                        )
                        );


                case DISTRICT ->
                        spec = spec.and(
                                DistrictStatsPartySpecs
                                        .districtIn(
                                                operationAccessPolicy
                                                        .assignedDistrictIds(
                                                                electionId
                                                        )
                                        )
                        );


                case CENTER, PLACE ->
                        throw new AccessDeniedException(
                                "Current assignment scope cannot view district-level aggregate results"
                        );


                default ->
                        throw new AccessDeniedException(
                                "Unsupported operational scope for district-level results"
                        );
            }
        }


        Page<DistrictStatsParty> page =
                repo.findAll(
                        spec,
                        pageable
                );


        Page<DistrictStatsPartyDto> dtoPage =
                page.map(
                        mapper::toDto
                );


        log.debug(
                "listDistrictStats returning {} elements (totalElements={})",
                dtoPage.getNumberOfElements(),
                dtoPage.getTotalElements()
        );


        meterRegistry.gauge(
                "api.stats.districts.result_size",
                dtoPage.getContent(),
                content -> (double) content.size()
        );


        return dtoPage;
    }
}