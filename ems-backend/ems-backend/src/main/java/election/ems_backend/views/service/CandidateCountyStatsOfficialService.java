package election.ems_backend.views.service;

import election.ems_backend.enums.AssignmentScope;
import election.ems_backend.policy.OperationAccessPolicy;
import election.ems_backend.policy.OperationRolePolicy;
import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.CandidateCountyStatsOfficialSpecs;
import election.ems_backend.views.dto.CandidateCountyStatsOfficialDto;
import election.ems_backend.views.entity.CandidateCountyStatsOfficial;
import election.ems_backend.views.mapper.CandidateCountyStatsOfficialMapper;
import election.ems_backend.views.repo.CandidateCountyStatsOfficialRepository;
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
 * Service for v_candidate_county_stats_official.
 */
@Service
@RequiredArgsConstructor
public class CandidateCountyStatsOfficialService {

    private static final Logger log =
            LoggerFactory.getLogger(
                    CandidateCountyStatsOfficialService.class
            );

    private final CandidateCountyStatsOfficialRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;

    private final OperationRolePolicy operationRolePolicy;
    private final OperationAccessPolicy operationAccessPolicy;

    private final CandidateCountyStatsOfficialMapper mapper =
            new CandidateCountyStatsOfficialMapper();


    @Transactional(readOnly = true)
    @Cacheable(
            value = "candidateCountyStatsOfficial",
            key =
                    "T(java.lang.String).valueOf(#electionId) + ':'"
                            + " + (#contestId==null?'':#contestId) + ':'"
                            + " + (#countyId==null?'':#countyId) + ':'"
                            + " + (#candidateId==null?'':#candidateId) + ':'"
                            + " + (#partyId==null?'':#partyId) + ':'"
                            + " + #pageable.pageNumber + ':'"
                            + " + #pageable.pageSize + ':'"
                            + " + #pageable.sort",
            condition = "!@operationRolePolicy.isOperationalRole()"
    )
    public Page<CandidateCountyStatsOfficialDto> listCandidateCountyOfficialStats(
            UUID electionId,
            UUID contestId,
            UUID countyId,
            UUID candidateId,
            UUID partyId,
            Pageable pageable
    ) {

        log.debug(
                "listCandidateCountyOfficialStats called " +
                        "electionId={} contestId={} countyId={} " +
                        "candidateId={} partyId={} page={} size={}",
                electionId,
                contestId,
                countyId,
                candidateId,
                partyId,
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

        Specification<CandidateCountyStatsOfficial> spec =
                Specification
                        .where(
                                CandidateCountyStatsOfficialSpecs
                                        .electionEquals(
                                                electionId
                                        )
                        )
                        .and(
                                CandidateCountyStatsOfficialSpecs
                                        .contestEquals(
                                                contestId
                                        )
                        )
                        .and(
                                CandidateCountyStatsOfficialSpecs
                                        .countyEquals(
                                                countyId
                                        )
                        )
                        .and(
                                CandidateCountyStatsOfficialSpecs
                                        .candidateEquals(
                                                candidateId
                                        )
                        )
                        .and(
                                CandidateCountyStatsOfficialSpecs
                                        .partyEquals(
                                                partyId
                                        )
                        );

        /*
         * Operational authorization.
         *
         * This is a COUNTY-level aggregate view.
         *
         * ORGANIZATION
         *     -> all counties in the election
         *
         * MULTI_COUNTY
         *     -> assigned counties only
         *
         * COUNTY
         *     -> assigned county only
         *
         * DISTRICT / CENTER / PLACE
         *     -> denied because a county aggregate contains data
         *        outside those lower-level assignments.
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
                     * Election-wide assignment.
                     * Existing election filter is sufficient.
                     */
                }

                case MULTI_COUNTY, COUNTY ->
                        spec = spec.and(
                                CandidateCountyStatsOfficialSpecs
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

        Page<CandidateCountyStatsOfficial> page =
                repo.findAll(
                        spec,
                        pageable
                );

        meterRegistry.gauge(
                "api.stats.official.candidate_county.result_size",
                page.getContent(),
                content -> (double) content.size()
        );

        return page.map(
                mapper::toDto
        );
    }
}