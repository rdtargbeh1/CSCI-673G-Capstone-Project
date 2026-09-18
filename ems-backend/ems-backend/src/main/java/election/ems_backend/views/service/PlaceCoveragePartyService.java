package election.ems_backend.views.service;

import election.ems_backend.enums.AssignmentScope;
import election.ems_backend.policy.OperationAccessPolicy;
import election.ems_backend.policy.OperationRolePolicy;
import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.PlaceCoveragePartySpecs;
import election.ems_backend.views.dto.PlaceCoveragePartyDto;
import election.ems_backend.views.entity.PlaceCoverageParty;
import election.ems_backend.views.mapper.PlaceCoveragePartyMapper;
import election.ems_backend.views.repository.PlaceCoveragePartyRepository;
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
public class PlaceCoveragePartyService {

    private final PlaceCoveragePartyRepository repo;
    private final TenantGucService tenantGucService;

    private final OperationRolePolicy operationRolePolicy;
    private final OperationAccessPolicy operationAccessPolicy;

    private final PlaceCoveragePartyMapper mapper =
            new PlaceCoveragePartyMapper();


    @Transactional(readOnly = true)
    public Page<PlaceCoveragePartyDto> list(
            UUID orgId,
            UUID electionId,
            UUID contestId,
            UUID centerId,
            UUID placeId,
            Boolean reported,
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
         * Operational callers must remain inside the authenticated
         * organization boundary.
         */
        if (
                operationRolePolicy.isOperationalRole()
                        && !operationRolePolicy.isAdministrativeRole()
        ) {

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


        /*
         * Apply tenant GUC before any repository query.
         *
         * This keeps PostgreSQL RLS/current_setting(...) behavior
         * consistent with the other tenant result services.
         */
        tenantGucService.applyForTransaction(
                orgId,
                false,
                false
        );


        Specification<PlaceCoverageParty> spec =
                Specification
                        .where(
                                PlaceCoveragePartySpecs.orgId(
                                        orgId
                                )
                        )
                        .and(
                                PlaceCoveragePartySpecs.electionId(
                                        electionId
                                )
                        )
                        .and(
                                PlaceCoveragePartySpecs.contestId(
                                        contestId
                                )
                        )
                        .and(
                                PlaceCoveragePartySpecs.centerId(
                                        centerId
                                )
                        )
                        .and(
                                PlaceCoveragePartySpecs.placeId(
                                        placeId
                                )
                        )
                        .and(
                                PlaceCoveragePartySpecs.isPlaceReported(
                                        reported
                                )
                        );


        /*
         * Operational authorization.
         *
         * PlaceCoverageParty is a PLACE-level coverage view.
         *
         * ORGANIZATION
         *     -> all places for the organization/election
         *
         * CENTER
         *     -> places inside assigned center(s)
         *
         * PLACE
         *     -> assigned place(s)
         *
         * MULTI_COUNTY / COUNTY / DISTRICT
         *     -> denied because this view does not expose
         *        countyId or districtId.
         */
        if (
                operationRolePolicy.isOperationalRole()
                        && !operationRolePolicy.isAdministrativeRole()
        ) {

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
                                PlaceCoveragePartySpecs.centerIn(
                                        operationAccessPolicy
                                                .assignedCenterIds(
                                                        electionId
                                                )
                                )
                        );


                case PLACE ->
                        spec = spec.and(
                                PlaceCoveragePartySpecs.placeIn(
                                        operationAccessPolicy
                                                .assignedPlaceIds(
                                                        electionId
                                                )
                                )
                        );


                case MULTI_COUNTY, COUNTY, DISTRICT ->
                        throw new AccessDeniedException(
                                "Current place-coverage view does not expose enough geography to safely filter this assignment scope"
                        );


                default ->
                        throw new AccessDeniedException(
                                "Unsupported operational scope for place coverage"
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