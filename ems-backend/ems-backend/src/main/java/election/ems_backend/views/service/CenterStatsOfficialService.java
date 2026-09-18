package election.ems_backend.views.service;

import election.ems_backend.enums.AssignmentScope;
import election.ems_backend.policy.OperationAccessPolicy;
import election.ems_backend.policy.OperationRolePolicy;
import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.CenterStatsOfficialSpecs;
import election.ems_backend.views.dto.CenterStatsOfficialDto;
import election.ems_backend.views.entity.CenterStatsOfficial;
import election.ems_backend.views.mapper.CenterStatsOfficialMapper;
import election.ems_backend.views.repo.CenterStatsOfficialRepository;
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
 * Service for NEC official center stats (v_center_stats_official).
 *
 * Note:
 * v_center_stats_official already filters nr.is_published = TRUE.
 *
 * contestId is optional:
 * - contestId == null => all contests
 */
@Service
@RequiredArgsConstructor
public class CenterStatsOfficialService {

    private static final Logger log =
            LoggerFactory.getLogger(
                    CenterStatsOfficialService.class
            );

    private final CenterStatsOfficialRepository repo;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;

    private final OperationRolePolicy operationRolePolicy;
    private final OperationAccessPolicy operationAccessPolicy;

    private final CenterStatsOfficialMapper mapper =
            new CenterStatsOfficialMapper();


    @Transactional(readOnly = true)
    @Cacheable(
            value = "centerStatsOfficial",
            key =
                    "T(java.lang.String).valueOf(#electionId)"
                            + " + ':' + (#contestId==null?'':#contestId)"
                            + " + ':' + (#countyId==null?'':#countyId)"
                            + " + ':' + (#districtId==null?'':#districtId)"
                            + " + ':' + (#centerId==null?'':#centerId)"
                            + " + ':' + #pageable.pageNumber"
                            + " + ':' + #pageable.pageSize"
                            + " + ':' + #pageable.sort",
            condition = "!@operationRolePolicy.isOperationalRole()"
    )
    public Page<CenterStatsOfficialDto> listOfficialCenters(
            UUID electionId,
            UUID contestId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            Pageable pageable
    ) {

        log.debug(
                "listOfficialCenters called electionId={} contestId={} " +
                        "countyId={} districtId={} centerId={} page={} size={}",
                electionId,
                contestId,
                countyId,
                districtId,
                centerId,
                pageable.getPageNumber(),
                pageable.getPageSize()
        );

        if (electionId == null) {
            throw new IllegalArgumentException(
                    "electionId is required"
            );
        }


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


        Specification<CenterStatsOfficial> spec =
                Specification
                        .where(
                                CenterStatsOfficialSpecs.electionEquals(
                                        electionId
                                )
                        )
                        .and(
                                CenterStatsOfficialSpecs.contestEquals(
                                        contestId
                                )
                        )
                        .and(
                                CenterStatsOfficialSpecs.countyEquals(
                                        countyId
                                )
                        )
                        .and(
                                CenterStatsOfficialSpecs.districtEquals(
                                        districtId
                                )
                        )
                        .and(
                                CenterStatsOfficialSpecs.centerEquals(
                                        centerId
                                )
                        );


        /*
         * Operational authorization.
         *
         * CenterStatsOfficial is a CENTER-level result view.
         *
         * ORGANIZATION
         *     -> all centers in the election
         *
         * MULTI_COUNTY / COUNTY
         *     -> centers inside assigned counties
         *
         * DISTRICT
         *     -> centers inside assigned districts
         *
         * CENTER
         *     -> assigned centers only
         *
         * PLACE
         *     -> denied because a center aggregate includes
         *        results from other places in the center
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
                                CenterStatsOfficialSpecs.countyIn(
                                        operationAccessPolicy
                                                .assignedCountyIds(
                                                        electionId
                                                )
                                )
                        );

                case DISTRICT ->
                        spec = spec.and(
                                CenterStatsOfficialSpecs.districtIn(
                                        operationAccessPolicy
                                                .assignedDistrictIds(
                                                        electionId
                                                )
                                )
                        );

                case CENTER ->
                        spec = spec.and(
                                CenterStatsOfficialSpecs.centerIn(
                                        operationAccessPolicy
                                                .assignedCenterIds(
                                                        electionId
                                                )
                                )
                        );

                case PLACE ->
                        throw new AccessDeniedException(
                                "Place-scoped users cannot view center-level aggregate results"
                        );

                default ->
                        throw new AccessDeniedException(
                                "Unsupported operational scope for center-level results"
                        );
            }
        }


        Page<CenterStatsOfficial> page =
                repo.findAll(
                        spec,
                        pageable
                );

        meterRegistry.gauge(
                "api.stats.official.center.result_size",
                page.getContent(),
                content -> (double) content.size()
        );

        return page.map(
                mapper::toDto
        );
    }
}