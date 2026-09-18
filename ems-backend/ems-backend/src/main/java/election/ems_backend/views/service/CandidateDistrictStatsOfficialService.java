package election.ems_backend.views.service;

import election.ems_backend.enums.AssignmentScope;
import election.ems_backend.policy.OperationAccessPolicy;
import election.ems_backend.policy.OperationRolePolicy;
import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.CandidateDistrictStatsOfficialSpecs;
import election.ems_backend.views.dto.CandidateDistrictStatsOfficialDto;
import election.ems_backend.views.entity.CandidateDistrictStatsOfficial;
import election.ems_backend.views.mapper.CandidateDistrictStatsOfficialMapper;
import election.ems_backend.views.repo.CandidateDistrictStatsOfficialRepository;
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
 * Service for v_candidate_district_stats_official.
 */
@Service
@RequiredArgsConstructor
public class CandidateDistrictStatsOfficialService {

    private static final Logger log =
            LoggerFactory.getLogger(
                    CandidateDistrictStatsOfficialService.class
            );

    private final CandidateDistrictStatsOfficialRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;

    private final OperationRolePolicy operationRolePolicy;
    private final OperationAccessPolicy operationAccessPolicy;

    private final CandidateDistrictStatsOfficialMapper mapper =
            new CandidateDistrictStatsOfficialMapper();


    @Transactional(readOnly = true)
    @Cacheable(
            value = "candidateDistrictStatsOfficial",
            key =
                    "T(java.lang.String).valueOf(#electionId)"
                            + " + ':' + (#contestId==null ? '' : #contestId)"
                            + " + ':' + (#countyId==null ? '' : #countyId)"
                            + " + ':' + (#districtId==null ? '' : #districtId)"
                            + " + ':' + (#candidateId==null ? '' : #candidateId)"
                            + " + ':' + (#partyId==null ? '' : #partyId)"
                            + " + ':' + #pageable.pageNumber"
                            + " + ':' + #pageable.pageSize"
                            + " + ':' + #pageable.sort",
            condition = "!@operationRolePolicy.isOperationalRole()"
    )
    public Page<CandidateDistrictStatsOfficialDto> listCandidateDistrictOfficialStats(
            UUID electionId,
            UUID contestId,
            UUID countyId,
            UUID districtId,
            UUID candidateId,
            UUID partyId,
            Pageable pageable
    ) {

        log.debug(
                "listCandidateDistrictOfficialStats called " +
                        "electionId={} contestId={} countyId={} districtId={} " +
                        "candidateId={} partyId={} page={} size={}",
                electionId,
                contestId,
                countyId,
                districtId,
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


        Specification<CandidateDistrictStatsOfficial> spec =
                Specification
                        .where(
                                CandidateDistrictStatsOfficialSpecs
                                        .electionEquals(
                                                electionId
                                        )
                        )
                        .and(
                                CandidateDistrictStatsOfficialSpecs
                                        .contestEquals(
                                                contestId
                                        )
                        )
                        .and(
                                CandidateDistrictStatsOfficialSpecs
                                        .countyEquals(
                                                countyId
                                        )
                        )
                        .and(
                                CandidateDistrictStatsOfficialSpecs
                                        .districtEquals(
                                                districtId
                                        )
                        )
                        .and(
                                CandidateDistrictStatsOfficialSpecs
                                        .candidateEquals(
                                                candidateId
                                        )
                        )
                        .and(
                                CandidateDistrictStatsOfficialSpecs
                                        .partyEquals(
                                                partyId
                                        )
                        );


        /*
         * Operational authorization.
         *
         * This is a DISTRICT-level result view.
         *
         * ORGANIZATION
         *     -> all districts in the election
         *
         * MULTI_COUNTY / COUNTY
         *     -> all districts inside assigned counties
         *
         * DISTRICT
         *     -> assigned districts only
         *
         * CENTER / PLACE
         *     -> denied because a district aggregate contains
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
                     * Election-wide assignment.
                     * Existing election filter is sufficient.
                     */
                }

                case MULTI_COUNTY, COUNTY ->
                        spec = spec.and(
                                CandidateDistrictStatsOfficialSpecs
                                        .countyIn(
                                                operationAccessPolicy
                                                        .assignedCountyIds(
                                                                electionId
                                                        )
                                        )
                        );

                case DISTRICT ->
                        spec = spec.and(
                                CandidateDistrictStatsOfficialSpecs
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


        Page<CandidateDistrictStatsOfficial> page =
                repo.findAll(
                        spec,
                        pageable
                );

        meterRegistry.gauge(
                "api.stats.official.candidate_district.result_size",
                page.getContent(),
                content -> (double) content.size()
        );

        return page.map(
                mapper::toDto
        );
    }
}