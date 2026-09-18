package election.ems_backend.views.service;

import election.ems_backend.enums.AssignmentScope;
import election.ems_backend.policy.OperationAccessPolicy;
import election.ems_backend.policy.OperationRolePolicy;
import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.CandidateCountyCompareSpecs;
import election.ems_backend.views.dto.CandidateCountyCompareDto;
import election.ems_backend.views.entity.CandidateCountyCompare;
import election.ems_backend.views.mapper.CandidateCountyCompareMapper;
import election.ems_backend.views.repo.CandidateCountyCompareRepository;
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
 * Service for v_candidate_county_compare.
 */
@Service
@RequiredArgsConstructor
public class CandidateCountyCompareService {

    private static final Logger log =
            LoggerFactory.getLogger(
                    CandidateCountyCompareService.class
            );

    private final CandidateCountyCompareRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;

    private final OperationRolePolicy operationRolePolicy;
    private final OperationAccessPolicy operationAccessPolicy;

    private final CandidateCountyCompareMapper mapper =
            new CandidateCountyCompareMapper();


    @Transactional(readOnly = true)
    @Cacheable(
            value = "candidateCountyCompare",
            key =
                    "T(java.lang.String).valueOf(#electionId)"
                            + " + ':' + (#contestId==null?'':#contestId)"
                            + " + ':' + (#countyId==null?'':#countyId)"
                            + " + ':' + (#candidateId==null?'':#candidateId)"
                            + " + ':' + (#orgId==null?'':#orgId)"
                            + " + ':' + (#partyId==null?'':#partyId)"
                            + " + ':' + #pageable.pageNumber"
                            + " + ':' + #pageable.pageSize"
                            + " + ':' + #pageable.sort",
            condition = "!@operationRolePolicy.isOperationalRole()"
    )
    public Page<CandidateCountyCompareDto> listCandidateCountyCompare(
            UUID electionId,
            UUID contestId,
            UUID countyId,
            UUID candidateId,
            UUID orgId,
            UUID partyId,
            Pageable pageable
    ) {

        log.debug(
                "listCandidateCountyCompare electionId={} contestId={} " +
                        "countyId={} candidateId={} orgId={} partyId={} " +
                        "page={} size={}",
                electionId,
                contestId,
                countyId,
                candidateId,
                orgId,
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
         * Preserve tenant context behavior.
         *
         * When an organization is present in the authenticated context,
         * it becomes authoritative for operational access.
         */
        UUID derivedOrgId =
                SecurityUtils.getOrgIdFromContext();

        UUID effectiveOrgId =
                orgId;

        if (derivedOrgId != null) {

            if (orgId != null
                    && !derivedOrgId.equals(orgId)) {

                throw new AccessDeniedException(
                        "Requested organization does not match the authenticated organization"
                );
            }

            effectiveOrgId =
                    derivedOrgId;
        }

        /*
         * Operational users must always have an organization boundary.
         */
        if (operationRolePolicy.isOperationalRole()
                && effectiveOrgId == null) {

            throw new AccessDeniedException(
                    "Operational result comparison requires an organization context"
            );
        }

        if (effectiveOrgId != null) {

            tenantGucService.applyForTransaction(
                    effectiveOrgId,
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


        Specification<CandidateCountyCompare> spec =
                Specification
                        .where(
                                CandidateCountyCompareSpecs
                                        .electionEquals(
                                                electionId
                                        )
                        )
                        .and(
                                CandidateCountyCompareSpecs
                                        .contestEquals(
                                                contestId
                                        )
                        )
                        .and(
                                CandidateCountyCompareSpecs
                                        .countyEquals(
                                                countyId
                                        )
                        )
                        .and(
                                CandidateCountyCompareSpecs
                                        .candidateEquals(
                                                candidateId
                                        )
                        )
                        .and(
                                CandidateCountyCompareSpecs
                                        .orgEquals(
                                                effectiveOrgId
                                        )
                        )
                        .and(
                                CandidateCountyCompareSpecs
                                        .partyEquals(
                                                partyId
                                        )
                        );


        /*
         * Operational authorization.
         *
         * CandidateCountyCompare is a COUNTY-level aggregate comparison.
         *
         * ORGANIZATION
         *     -> all counties for the organization/election.
         *
         * MULTI_COUNTY
         *     -> assigned counties only.
         *
         * COUNTY
         *     -> assigned county only.
         *
         * DISTRICT / CENTER / PLACE
         *     -> denied because the county comparison contains
         *        data outside those lower-level assignments.
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
                     * Existing organization + election filters
                     * are sufficient.
                     */
                }

                case MULTI_COUNTY, COUNTY ->
                        spec = spec.and(
                                CandidateCountyCompareSpecs
                                        .countyIn(
                                                operationAccessPolicy
                                                        .assignedCountyIds(
                                                                electionId
                                                        )
                                        )
                        );

                case DISTRICT, CENTER, PLACE ->
                        throw new AccessDeniedException(
                                "Current assignment scope cannot view county-level comparison results"
                        );

                default ->
                        throw new AccessDeniedException(
                                "Unsupported operational scope for county-level comparison results"
                        );
            }
        }


        Page<CandidateCountyCompare> page =
                repo.findAll(
                        spec,
                        pageable
                );

        meterRegistry.gauge(
                "api.stats.compare.candidate_county.result_size",
                page.getContent(),
                content -> (double) content.size()
        );

        return page.map(
                mapper::toDto
        );
    }
}