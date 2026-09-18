package election.ems_backend.views.service;

import election.ems_backend.enums.AssignmentScope;
import election.ems_backend.policy.OperationAccessPolicy;
import election.ems_backend.policy.OperationRolePolicy;
import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.CenterCoveragePartySpecs;
import election.ems_backend.views.dto.CenterCoveragePartyDto;
import election.ems_backend.views.entity.CenterCoverageParty;
import election.ems_backend.views.mapper.CenterCoveragePartyMapper;
import election.ems_backend.views.repo.CenterCoveragePartyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CenterCoveragePartyService {

    private final CenterCoveragePartyRepository repo;

    private final OperationRolePolicy operationRolePolicy;
    private final OperationAccessPolicy operationAccessPolicy;

    private final CenterCoveragePartyMapper mapper =
            new CenterCoveragePartyMapper();


    @Transactional(readOnly = true)
    public Page<CenterCoveragePartyDto> list(
            UUID orgId,
            UUID electionId,
            UUID contestId,
            UUID centerId,
            Boolean started,
            Boolean completed,
            Pageable pageable
    ) {

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


        /*
         * For operational users, the authenticated organization
         * is authoritative.
         */
        if (operationRolePolicy.isOperationalRole()) {

            UUID derivedOrgId =
                    SecurityUtils.getOrgIdFromContext();

            if (derivedOrgId == null) {

                throw new AccessDeniedException(
                        "Operational coverage access requires an organization context"
                );
            }

            if (!derivedOrgId.equals(orgId)) {

                throw new AccessDeniedException(
                        "Requested organization does not match the authenticated organization"
                );
            }
        }


        Specification<CenterCoverageParty> spec =
                Specification
                        .where(
                                CenterCoveragePartySpecs.orgId(
                                        orgId
                                )
                        )
                        .and(
                                CenterCoveragePartySpecs.electionId(
                                        electionId
                                )
                        )
                        .and(
                                CenterCoveragePartySpecs.contestId(
                                        contestId
                                )
                        )
                        .and(
                                CenterCoveragePartySpecs.centerId(
                                        centerId
                                )
                        )
                        .and(
                                CenterCoveragePartySpecs.started(
                                        started
                                )
                        )
                        .and(
                                CenterCoveragePartySpecs.completed(
                                        completed
                                )
                        );


        /*
         * Operational authorization.
         *
         * CenterCoverageParty is CENTER-level, but the current view
         * exposes only centerId and does not expose countyId/districtId.
         *
         * ORGANIZATION
         *     -> all centers for the organization/election
         *
         * CENTER
         *     -> assigned center(s)
         *
         * MULTI_COUNTY / COUNTY / DISTRICT
         *     -> currently denied because descendant-center filtering
         *        cannot be safely expressed from this view
         *
         * PLACE
         *     -> denied because center coverage includes all places
         *        within the center
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

                case CENTER ->
                        spec = spec.and(
                                CenterCoveragePartySpecs.centerIn(
                                        operationAccessPolicy
                                                .assignedCenterIds(
                                                        electionId
                                                )
                                )
                        );

                case MULTI_COUNTY, COUNTY, DISTRICT ->
                        throw new AccessDeniedException(
                                "Current center-coverage view does not expose enough geography to safely filter this assignment scope"
                        );

                case PLACE ->
                        throw new AccessDeniedException(
                                "Place-scoped users cannot view center-level coverage aggregates"
                        );

                default ->
                        throw new AccessDeniedException(
                                "Unsupported operational scope for center coverage"
                        );
            }
        }


        return repo.findAll(
                spec,
                pageable
        ).map(
                mapper::toDto
        );
    }
}