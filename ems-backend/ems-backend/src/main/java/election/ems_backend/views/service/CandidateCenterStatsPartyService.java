package election.ems_backend.views.service;

import election.ems_backend.enums.AssignmentScope;
import election.ems_backend.policy.OperationAccessPolicy;
import election.ems_backend.policy.OperationRolePolicy;
import election.ems_backend.views.CandidateCenterStatsPartySpecs;
import election.ems_backend.views.dto.CandidateCenterStatsPartyDto;
import election.ems_backend.views.entity.CandidateCenterStatsParty;
import election.ems_backend.views.mapper.CandidateCenterStatsPartyMapper;
import election.ems_backend.views.repo.CandidateCenterStatsPartyRepository;
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
 * Production-ready service for v_candidate_center_stats_party.
 *
 * - Validates election existence via centralized service.
 * - Applies tenant GUCs inside transaction so RLS policies apply.
 * - Applies operational election/geographic scope authorization.
 * - Cacheable for non-operational callers.
 * - Metrics and logging.
 */
@Service
@RequiredArgsConstructor
public class CandidateCenterStatsPartyService {

    private static final Logger log =
            LoggerFactory.getLogger(CandidateCenterStatsPartyService.class);

    private final CandidateCenterStatsPartyRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;

    private final OperationRolePolicy operationRolePolicy;
    private final OperationAccessPolicy operationAccessPolicy;

    private final CandidateCenterStatsPartyMapper mapper =
            new CandidateCenterStatsPartyMapper();


    @Transactional(readOnly = true)
    @Cacheable(
            value = "candidateCenterStatsParty",
            key =
                    "T(java.lang.String).valueOf(#orgId) + ':' + #electionId"
                            + " + ':' + (#contestId==null?'':#contestId)"
                            + " + ':' + (#countyId==null?'':#countyId)"
                            + " + ':' + (#districtId==null?'':#districtId)"
                            + " + ':' + (#centerId==null?'':#centerId)"
                            + " + ':' + (#candidateId==null?'':#candidateId)"
                            + " + ':' + (#partyId==null?'':#partyId)"
                            + " + ':' + #pageable.pageNumber"
                            + " + ':' + #pageable.pageSize"
                            + " + ':' + #pageable.sort",
            condition = "!@operationRolePolicy.isOperationalRole()"
    )
    public Page<CandidateCenterStatsPartyDto> listCandidateCenterStats(
            UUID orgId,
            UUID electionId,
            UUID contestId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID candidateId,
            UUID partyId,
            Pageable pageable
    ) {

        log.debug(
                "listCandidateCenterStats called orgId={} electionId={} " +
                        "contestId={} countyId={} districtId={} centerId={} " +
                        "candidateId={} partyId={} page={} size={}",
                orgId,
                electionId,
                contestId,
                countyId,
                districtId,
                centerId,
                candidateId,
                partyId,
                pageable.getPageNumber(),
                pageable.getPageSize()
        );

        if (orgId == null) {
            throw new IllegalArgumentException("orgId is required");
        }

        if (electionId == null) {
            throw new IllegalArgumentException("electionId is required");
        }

        electionValidationService.ensureExists(electionId);

        /*
         * Preserve the existing tenant/RLS behavior.
         */
        tenantGucService.applyForTransaction(
                orgId,
                false,
                false
        );

        /*
         * Existing request filters.
         */
        Specification<CandidateCenterStatsParty> spec =
                Specification
                        .where(
                                CandidateCenterStatsPartySpecs.orgEquals(
                                        orgId
                                )
                        )
                        .and(
                                CandidateCenterStatsPartySpecs.electionEquals(
                                        electionId
                                )
                        )
                        .and(
                                CandidateCenterStatsPartySpecs.contestEquals(
                                        contestId
                                )
                        )
                        .and(
                                CandidateCenterStatsPartySpecs.countyEquals(
                                        countyId
                                )
                        )
                        .and(
                                CandidateCenterStatsPartySpecs.districtEquals(
                                        districtId
                                )
                        )
                        .and(
                                CandidateCenterStatsPartySpecs.centerEquals(
                                        centerId
                                )
                        )
                        .and(
                                CandidateCenterStatsPartySpecs.candidateEquals(
                                        candidateId
                                )
                        )
                        .and(
                                CandidateCenterStatsPartySpecs.partyEquals(
                                        partyId
                                )
                        );

        /*
         * Operational authorization.
         *
         * This view is CENTER-level:
         *
         * ORGANIZATION
         *     -> all centers for the election
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
         *     -> denied because a center aggregate includes results
         *        belonging to other places in that center.
         *
         * Administrative and other non-operational callers retain the
         * existing behavior.
         */
        if (operationRolePolicy.isOperationalRole()) {

            if (!operationAccessPolicy.hasOperationalAccess(electionId)) {
                throw new AccessDeniedException(
                        "User does not have operational access to this election"
                );
            }

            AssignmentScope scope =
                    operationAccessPolicy.currentScope(electionId);

            if (scope == null) {
                throw new AccessDeniedException(
                        "User has no active election assignment scope"
                );
            }

            switch (scope) {

                case ORGANIZATION -> {
                    /*
                     * Election-level assignment.
                     * Existing election/org filters are sufficient.
                     */
                }

                case MULTI_COUNTY, COUNTY ->
                        spec = spec.and(
                                CandidateCenterStatsPartySpecs.countyIn(
                                        operationAccessPolicy.assignedCountyIds(
                                                electionId
                                        )
                                )
                        );

                case DISTRICT ->
                        spec = spec.and(
                                CandidateCenterStatsPartySpecs.districtIn(
                                        operationAccessPolicy.assignedDistrictIds(
                                                electionId
                                        )
                                )
                        );

                case CENTER ->
                        spec = spec.and(
                                CandidateCenterStatsPartySpecs.centerIn(
                                        operationAccessPolicy.assignedCenterIds(
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

        Page<CandidateCenterStatsParty> page =
                repo.findAll(
                        spec,
                        pageable
                );

        meterRegistry.gauge(
                "api.stats.candidate_center.result_size",
                page.getContent(),
                content -> (double) content.size()
        );

        return page.map(
                mapper::toDto
        );
    }
}