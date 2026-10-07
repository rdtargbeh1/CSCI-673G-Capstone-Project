package election.ems_backend.views.service;

import election.ems_backend.enums.AssignmentScope;
import election.ems_backend.policy.OperationAccessPolicy;
import election.ems_backend.policy.OperationRolePolicy;
import election.ems_backend.views.CandidateDistrictStatsPartySpecs;
import election.ems_backend.views.dto.CandidateDistrictStatsPartyDto;
import election.ems_backend.views.entity.CandidateDistrictStatsParty;
import election.ems_backend.views.mapper.CandidateDistrictStatsPartyMapper;
import election.ems_backend.views.repo.CandidateDistrictStatsPartyRepository;
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
 * Production-ready service for v_candidate_district_stats_party.
 */
@Service
@RequiredArgsConstructor
public class CandidateDistrictStatsPartyService {

    private static final Logger log =
            LoggerFactory.getLogger(
                    CandidateDistrictStatsPartyService.class
            );

    private final CandidateDistrictStatsPartyRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;

    private final OperationRolePolicy operationRolePolicy;
    private final OperationAccessPolicy operationAccessPolicy;

    private final CandidateDistrictStatsPartyMapper mapper =
            new CandidateDistrictStatsPartyMapper();


    @Transactional(readOnly = true)
    @Cacheable(
            value = "candidateDistrictStatsParty",
            key =
                    "T(java.lang.String).valueOf(#orgId) + ':' + #electionId"
                            + " + ':' + (#contestId==null?'':#contestId)"
                            + " + ':' + (#countyId==null?'':#countyId)"
                            + " + ':' + (#districtId==null?'':#districtId)"
                            + " + ':' + (#candidateId==null?'':#candidateId)"
                            + " + ':' + (#partyId==null?'':#partyId)"
                            + " + ':' + #pageable.pageNumber"
                            + " + ':' + #pageable.pageSize"
                            + " + ':' + #pageable.sort",
            condition = "!@operationRolePolicy.isOperationalRole()"
    )
    public Page<CandidateDistrictStatsPartyDto> listCandidateDistrictStats(
            UUID orgId,
            UUID electionId,
            UUID contestId,
            UUID countyId,
            UUID districtId,
            UUID candidateId,
            UUID partyId,
            Pageable pageable
    ) {

        log.debug(
                "listCandidateDistrictStats called orgId={} electionId={} " +
                        "contestId={} countyId={} districtId={} " +
                        "candidateId={} partyId={} page={} size={}",
                orgId,
                electionId,
                contestId,
                countyId,
                districtId,
                candidateId,
                partyId,
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
         * Preserve existing tenant/RLS behavior.
         */
        tenantGucService.applyForTransaction(
                orgId,
                false,
                false
        );


        Specification<CandidateDistrictStatsParty> spec =
                Specification
                        .where(
                                CandidateDistrictStatsPartySpecs
                                        .orgEquals(
                                                orgId
                                        )
                        )
                        .and(
                                CandidateDistrictStatsPartySpecs
                                        .electionEquals(
                                                electionId
                                        )
                        )
                        .and(
                                CandidateDistrictStatsPartySpecs
                                        .contestEquals(
                                                contestId
                                        )
                        )
                        .and(
                                CandidateDistrictStatsPartySpecs
                                        .countyEquals(
                                                countyId
                                        )
                        )
                        .and(
                                CandidateDistrictStatsPartySpecs
                                        .districtEquals(
                                                districtId
                                        )
                        )
                        .and(
                                CandidateDistrictStatsPartySpecs
                                        .candidateEquals(
                                                candidateId
                                        )
                        )
                        .and(
                                CandidateDistrictStatsPartySpecs
                                        .partyEquals(
                                                partyId
                                        )
                        );


        /*
         * Operational authorization.
         *
         * CandidateDistrictStatsParty is a DISTRICT-level result view.
         *
         * ORGANIZATION
         *     -> all districts for the org/election
         *
         * MULTI_COUNTY / COUNTY
         *     -> all districts inside assigned counties
         *
         * DISTRICT
         *     -> assigned district(s) only
         *
         * CENTER / PLACE
         *     -> denied because a district aggregate contains
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
                                CandidateDistrictStatsPartySpecs
                                        .countyIn(
                                                operationAccessPolicy
                                                        .assignedCountyIds(
                                                                electionId
                                                        )
                                        )
                        );

                case DISTRICT ->
                        spec = spec.and(
                                CandidateDistrictStatsPartySpecs
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


        Page<CandidateDistrictStatsParty> page =
                repo.findAll(
                        spec,
                        pageable
                );

        meterRegistry.gauge(
                "api.stats.candidate_district.result_size",
                page.getContent(),
                content -> (double) content.size()
        );

        return page.map(
                mapper::toDto
        );
    }
}