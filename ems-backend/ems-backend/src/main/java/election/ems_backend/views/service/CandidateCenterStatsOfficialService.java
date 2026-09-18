package election.ems_backend.views.service;

import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.enums.AssignmentScope;
import election.ems_backend.policy.OperationAccessPolicy;
import election.ems_backend.policy.OperationRolePolicy;
import election.ems_backend.views.CandidateCenterStatsOfficialSpecs;
import election.ems_backend.views.dto.CandidateCenterStatsOfficialDto;
import election.ems_backend.views.entity.CandidateCenterStatsOfficial;
import election.ems_backend.views.mapper.CandidateCenterStatsOfficialMapper;
import election.ems_backend.views.repo.CandidateCenterStatsOfficialRepository;
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
 * Service for v_candidate_center_stats_official.
 */
@Service
@RequiredArgsConstructor
public class CandidateCenterStatsOfficialService {

    private static final Logger log = LoggerFactory.getLogger(CandidateCenterStatsOfficialService.class);

    private final CandidateCenterStatsOfficialRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;

    private final OperationRolePolicy operationRolePolicy;
    private final OperationAccessPolicy operationAccessPolicy;
    private final CandidateCenterStatsOfficialMapper mapper = new CandidateCenterStatsOfficialMapper();

    @Transactional(readOnly = true)
    @Cacheable(
            value = "candidateCenterStatsOfficial",
            key =
                    "T(java.lang.String).valueOf(#electionId)"
                            + " + ':' + (#contestId==null?'':#contestId)"
                            + " + ':' + (#countyId==null?'':#countyId)"
                            + " + ':' + (#districtId==null?'':#districtId)"
                            + " + ':' + (#centerId==null?'':#centerId)"
                            + " + ':' + (#candidateId==null?'':#candidateId)"
                            + " + ':' + (#partyId==null?'':#partyId)"
                            + " + ':' + #pageable.pageNumber"
                            + " + ':' + #pageable.pageSize"
                            + " + ':' + #pageable.sort"
    )
    public Page<CandidateCenterStatsOfficialDto> listCandidateCenterOfficialStats(
            UUID electionId,
            UUID contestId,   // ✅ now OPTIONAL
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID candidateId,
            UUID partyId,
            Pageable pageable
    ) {
        log.debug(
                "listCandidateCenterOfficialStats electionId={} contestId={} countyId={} districtId={} centerId={} candidateId={} partyId={} page={} size={}",
                electionId, contestId, countyId, districtId, centerId, candidateId, partyId,
                pageable.getPageNumber(), pageable.getPageSize()
        );

        if (electionId == null) throw new IllegalArgumentException("electionId is required");
        // ✅ removed: contestId required
        electionValidationService.ensureExists(electionId);

        UUID derivedOrgId = SecurityUtils.getOrgIdFromContext();
        if (derivedOrgId != null) {
            tenantGucService.applyForTransaction(derivedOrgId, false, false);
        } else {
            tenantGucService.applyForTransaction((UUID) null, false, false);
        }

        Specification<CandidateCenterStatsOfficial> spec = Specification
                .where(CandidateCenterStatsOfficialSpecs.electionEquals(electionId))
                .and(CandidateCenterStatsOfficialSpecs.contestEquals(contestId))
                .and(CandidateCenterStatsOfficialSpecs.countyEquals(countyId))
                .and(CandidateCenterStatsOfficialSpecs.districtEquals(districtId))
                .and(CandidateCenterStatsOfficialSpecs.centerEquals(centerId))
                .and(CandidateCenterStatsOfficialSpecs.candidateEquals(candidateId))
                .and(CandidateCenterStatsOfficialSpecs.partyEquals(partyId));

        /*
         * Result views are read-only, but operational users are still restricted
         * to their election assignment boundary.
         *
         * This is a CENTER-level result view:
         * - ORGANIZATION -> all centers in the election
         * - MULTI_COUNTY / COUNTY -> centers in assigned counties
         * - DISTRICT -> centers in assigned districts
         * - CENTER -> assigned centers only
         * - PLACE -> denied here because a center aggregate contains results
         *            from places beyond the assigned place
         *
         * Administrative/non-operational behavior remains unchanged.
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
                    // Election-level access is sufficient.
                }

                case MULTI_COUNTY, COUNTY ->
                        spec = spec.and(
                                CandidateCenterStatsOfficialSpecs.countyIn(
                                        operationAccessPolicy.assignedCountyIds(electionId)
                                )
                        );

                case DISTRICT ->
                        spec = spec.and(
                                CandidateCenterStatsOfficialSpecs.districtIn(
                                        operationAccessPolicy.assignedDistrictIds(electionId)
                                )
                        );

                case CENTER ->
                        spec = spec.and(
                                CandidateCenterStatsOfficialSpecs.centerIn(
                                        operationAccessPolicy.assignedCenterIds(electionId)
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

        Page<CandidateCenterStatsOfficial> page = repo.findAll(spec, pageable);

        meterRegistry.gauge(
                "api.stats.official.candidate_center.result_size",
                page.getContent(),
                c -> (double) c.size()
        );

        return page.map(mapper::toDto);
    }



}
