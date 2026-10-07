package election.ems_backend.views.service;

import election.ems_backend.enums.AssignmentScope;
import election.ems_backend.policy.OperationAccessPolicy;
import election.ems_backend.policy.OperationRolePolicy;
import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.CountyStatsOfficialSpecs;
import election.ems_backend.views.dto.CountyStatsOfficialDto;
import election.ems_backend.views.entity.CountyStatsOfficial;
import election.ems_backend.views.mapper.CountyStatsOfficialMapper;
import election.ems_backend.views.repo.CountyStatsOfficialRepository;
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
 * Service for v_county_stats_official.
 */
@Service
@RequiredArgsConstructor
public class CountyStatsOfficialService {

    private static final Logger log =
            LoggerFactory.getLogger(
                    CountyStatsOfficialService.class
            );

    private final CountyStatsOfficialRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;

    private final OperationRolePolicy operationRolePolicy;
    private final OperationAccessPolicy operationAccessPolicy;

    private final CountyStatsOfficialMapper mapper =
            new CountyStatsOfficialMapper();


    @Transactional(readOnly = true)
    @Cacheable(
            value = "countyStatsOfficial",
            key =
                    "T(java.lang.String).valueOf(#electionId)"
                            + " + ':' + (#contestId==null?'':#contestId)"
                            + " + ':' + (#countyId==null?'':#countyId)"
                            + " + ':' + #pageable.pageNumber"
                            + " + ':' + #pageable.pageSize"
                            + " + ':' + #pageable.sort",
            condition = "!@operationRolePolicy.isOperationalRole()"
    )
    public Page<CountyStatsOfficialDto> listOfficialCounties(
            UUID electionId,
            UUID contestId,
            UUID countyId,
            Pageable pageable
    ) {

        log.debug(
                "listOfficialCounties called electionId={} contestId={} " +
                        "countyId={} page={} size={}",
                electionId,
                contestId,
                countyId,
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


        Specification<CountyStatsOfficial> spec =
                Specification
                        .where(
                                CountyStatsOfficialSpecs
                                        .electionEquals(
                                                electionId
                                        )
                        )
                        .and(
                                CountyStatsOfficialSpecs
                                        .contestEquals(
                                                contestId
                                        )
                        )
                        .and(
                                CountyStatsOfficialSpecs
                                        .countyEquals(
                                                countyId
                                        )
                        );


        /*
         * Operational authorization.
         *
         * CountyStatsOfficial is a COUNTY-level result view.
         *
         * ORGANIZATION
         *     -> all counties in the election
         *
         * MULTI_COUNTY / COUNTY
         *     -> assigned counties only
         *
         * DISTRICT / CENTER / PLACE
         *     -> denied because a county aggregate contains
         *        results outside those lower-level assignments
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
                     * Election-level assignment.
                     * Existing election filter is sufficient.
                     */
                }

                case MULTI_COUNTY, COUNTY ->
                        spec = spec.and(
                                CountyStatsOfficialSpecs
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


        Page<CountyStatsOfficial> page =
                repo.findAll(
                        spec,
                        pageable
                );

        meterRegistry.gauge(
                "api.stats.official.county.result_size",
                page.getContent(),
                content -> (double) content.size()
        );

        return page.map(
                mapper::toDto
        );
    }
}