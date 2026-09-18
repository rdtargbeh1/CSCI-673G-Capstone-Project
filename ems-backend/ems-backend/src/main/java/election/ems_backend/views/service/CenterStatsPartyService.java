package election.ems_backend.views.service;

/**
 * Service exposing read-only center-level stats for a tenant.
 *
 * Behavior:
 * - Applies tenant GUCs using TenantGucService with SET LOCAL inside
 *   the transactional scope.
 * - Reads the view via the repository with pagination.
 * - Enforces organization/election and operational geographic scope.
 */

import election.ems_backend.enums.AssignmentScope;
import election.ems_backend.policy.OperationAccessPolicy;
import election.ems_backend.policy.OperationRolePolicy;
import election.ems_backend.repository.PollingCenterRepository;
import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.CenterStatsPartySpecs;
import election.ems_backend.views.dto.CenterStatsPartyDto;
import election.ems_backend.views.entity.CenterStatsParty;
import election.ems_backend.views.mapper.CenterStatsPartyMapper;
import election.ems_backend.views.repo.CenterStatsPartyRepository;
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

import java.util.*;

/**
 * Service implementation that enriches DTOs with polling center coordinates
 * and enforces org/election scoping at service level.
 */
@Service
@RequiredArgsConstructor
public class CenterStatsPartyService {

    private final CenterStatsPartyRepository repo;
    private final PollingCenterRepository pollingCenterRepo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;

    private final OperationRolePolicy operationRolePolicy;
    private final OperationAccessPolicy operationAccessPolicy;

    private final CenterStatsPartyMapper mapper =
            new CenterStatsPartyMapper();

    private static final Logger log =
            LoggerFactory.getLogger(
                    CenterStatsPartyService.class
            );

    private final MeterRegistry meterRegistry;


    /**
     * List center stats for given org/election filters.
     */
    @Transactional(readOnly = true)
    @Cacheable(
            value = "centerStatsParty",
            key =
                    "T(java.lang.String).valueOf(#orgId)"
                            + " + ':' + #electionId"
                            + " + ':' + (#contestId==null?'':#contestId)"
                            + " + ':' + (#countyId==null?'':#countyId)"
                            + " + ':' + (#districtId==null?'':#districtId)"
                            + " + ':' + (#centerId==null?'':#centerId)"
                            + " + ':' + #pageable.pageNumber"
                            + " + ':' + #pageable.pageSize"
                            + " + ':' + #pageable.sort",
            condition = "!@operationRolePolicy.isOperationalRole()"
    )
    public Page<CenterStatsPartyDto> listCenterStats(
            UUID orgId,
            UUID electionId,
            UUID contestId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            Pageable pageable
    ) {

        log.debug(
                "listCenterStatsParty orgId={} electionId={} contestId={} " +
                        "countyId={} districtId={} centerId={} page={} size={}",
                orgId,
                electionId,
                contestId,
                countyId,
                districtId,
                centerId,
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
         * Operational callers may not use a different tenant orgId.
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
         * Preserve tenant/RLS behavior.
         */
        tenantGucService.applyForTransaction(
                orgId,
                false,
                false
        );


        Specification<CenterStatsParty> spec =
                Specification
                        .where(
                                CenterStatsPartySpecs
                                        .orgEquals(
                                                orgId
                                        )
                        )
                        .and(
                                CenterStatsPartySpecs
                                        .electionEquals(
                                                electionId
                                        )
                        )
                        .and(
                                CenterStatsPartySpecs
                                        .contestEquals(
                                                contestId
                                        )
                        )
                        .and(
                                CenterStatsPartySpecs
                                        .countyEquals(
                                                countyId
                                        )
                        )
                        .and(
                                CenterStatsPartySpecs
                                        .districtEquals(
                                                districtId
                                        )
                        )
                        .and(
                                CenterStatsPartySpecs
                                        .centerEquals(
                                                centerId
                                        )
                        );


        /*
         * Operational authorization.
         *
         * CenterStatsParty is a CENTER-level result view.
         *
         * ORGANIZATION
         *     -> all centers for the org/election
         *
         * MULTI_COUNTY / COUNTY
         *     -> all centers inside assigned counties
         *
         * DISTRICT
         *     -> all centers inside assigned districts
         *
         * CENTER
         *     -> assigned center(s)
         *
         * PLACE
         *     -> denied because a center aggregate contains
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
                     * Existing org + election filters are sufficient.
                     */
                }

                case MULTI_COUNTY, COUNTY ->
                        spec = spec.and(
                                CenterStatsPartySpecs
                                        .countyIn(
                                                operationAccessPolicy
                                                        .assignedCountyIds(
                                                                electionId
                                                        )
                                        )
                        );

                case DISTRICT ->
                        spec = spec.and(
                                CenterStatsPartySpecs
                                        .districtIn(
                                                operationAccessPolicy
                                                        .assignedDistrictIds(
                                                                electionId
                                                        )
                                        )
                        );

                case CENTER ->
                        spec = spec.and(
                                CenterStatsPartySpecs
                                        .centerIn(
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


        Page<CenterStatsParty> page =
                repo.findAll(
                        spec,
                        pageable
                );

        meterRegistry.gauge(
                "api.stats.center_party.result_size",
                page.getContent(),
                content -> (double) content.size()
        );

        return page.map(
                mapper::toDto
        );
    }
}