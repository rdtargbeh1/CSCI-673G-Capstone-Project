package election.ems_backend.views.service;

import election.ems_backend.enums.AssignmentScope;
import election.ems_backend.policy.OperationAccessPolicy;
import election.ems_backend.policy.OperationRolePolicy;
import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.DistrictStatsOfficialSpecs;
import election.ems_backend.views.dto.DistrictStatsOfficialDto;
import election.ems_backend.views.entity.DistrictStatsOfficial;
import election.ems_backend.views.mapper.DistrictStatsOfficialMapper;
import election.ems_backend.views.repo.DistrictStatsOfficialRepository;
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
 * Service for v_district_stats_official.
 * Returns only aggregated official published NEC stats.
 *
 * contestId is optional:
 * - contestId == null => all contests
 */
@Service
@RequiredArgsConstructor
public class DistrictStatsOfficialService {

    private static final Logger log =
            LoggerFactory.getLogger(
                    DistrictStatsOfficialService.class
            );

    private final DistrictStatsOfficialRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;

    private final OperationRolePolicy operationRolePolicy;
    private final OperationAccessPolicy operationAccessPolicy;

    private final DistrictStatsOfficialMapper mapper =
            new DistrictStatsOfficialMapper();


    @Transactional(readOnly = true)
    @Cacheable(
            value = "districtStatsOfficial",
            key =
                    "T(java.lang.String).valueOf(#electionId)"
                            + " + ':' + (#contestId==null?'':#contestId)"
                            + " + ':' + (#countyId==null?'':#countyId)"
                            + " + ':' + (#districtId==null?'':#districtId)"
                            + " + ':' + #pageable.pageNumber"
                            + " + ':' + #pageable.pageSize"
                            + " + ':' + #pageable.sort",
            condition = "!@operationRolePolicy.isOperationalRole()"
    )
    public Page<DistrictStatsOfficialDto> listOfficialDistricts(
            UUID electionId,
            UUID contestId,
            UUID countyId,
            UUID districtId,
            Pageable pageable
    ) {

        log.debug(
                "listOfficialDistricts called electionId={} contestId={} " +
                        "countyId={} districtId={} page={} size={}",
                electionId,
                contestId,
                countyId,
                districtId,
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


        Specification<DistrictStatsOfficial> spec =
                Specification
                        .where(
                                DistrictStatsOfficialSpecs
                                        .electionEquals(
                                                electionId
                                        )
                        )
                        .and(
                                DistrictStatsOfficialSpecs
                                        .contestEquals(
                                                contestId
                                        )
                        )
                        .and(
                                DistrictStatsOfficialSpecs
                                        .countyEquals(
                                                countyId
                                        )
                        )
                        .and(
                                DistrictStatsOfficialSpecs
                                        .districtEquals(
                                                districtId
                                        )
                        );


        /*
         * Operational authorization.
         *
         * ORGANIZATION
         *     -> all districts
         *
         * MULTI_COUNTY / COUNTY
         *     -> all districts inside assigned counties
         *
         * DISTRICT
         *     -> assigned districts only
         *
         * CENTER / PLACE
         *     -> denied because district aggregates include
         *        data outside those lower-level assignments
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
                     * Existing election filter is sufficient.
                     */
                }

                case MULTI_COUNTY, COUNTY ->
                        spec = spec.and(
                                DistrictStatsOfficialSpecs
                                        .countyIn(
                                                operationAccessPolicy
                                                        .assignedCountyIds(
                                                                electionId
                                                        )
                                        )
                        );

                case DISTRICT ->
                        spec = spec.and(
                                DistrictStatsOfficialSpecs
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


        Page<DistrictStatsOfficial> page =
                repo.findAll(
                        spec,
                        pageable
                );

        meterRegistry.gauge(
                "api.stats.official.district.result_size",
                page.getContent(),
                content -> (double) content.size()
        );

        return page.map(
                mapper::toDto
        );
    }
}