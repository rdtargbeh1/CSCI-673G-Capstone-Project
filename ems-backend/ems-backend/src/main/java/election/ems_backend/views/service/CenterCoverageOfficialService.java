package election.ems_backend.views.service;

import election.ems_backend.enums.AssignmentScope;
import election.ems_backend.policy.OperationAccessPolicy;
import election.ems_backend.policy.OperationRolePolicy;
import election.ems_backend.views.CenterCoverageOfficialSpecs;
import election.ems_backend.views.dto.CenterCoverageOfficialDto;
import election.ems_backend.views.entity.CenterCoverageOfficial;
import election.ems_backend.views.mapper.CenterCoverageOfficialMapper;
import election.ems_backend.views.repo.CenterCoverageOfficialRepository;
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
public class CenterCoverageOfficialService {

    private final CenterCoverageOfficialRepository repo;

    private final OperationRolePolicy operationRolePolicy;
    private final OperationAccessPolicy operationAccessPolicy;

    private final CenterCoverageOfficialMapper mapper =
            new CenterCoverageOfficialMapper();


    @Transactional(readOnly = true)
    public Page<CenterCoverageOfficialDto> list(
            UUID electionId,
            UUID contestId,
            UUID centerId,
            Boolean started,
            Boolean completed,
            Pageable pageable
    ) {

        if (electionId == null) {
            throw new IllegalArgumentException(
                    "electionId is required"
            );
        }


        Specification<CenterCoverageOfficial> spec =
                Specification
                        .where(
                                CenterCoverageOfficialSpecs.electionId(
                                        electionId
                                )
                        )
                        .and(
                                CenterCoverageOfficialSpecs.contestId(
                                        contestId
                                )
                        )
                        .and(
                                CenterCoverageOfficialSpecs.centerId(
                                        centerId
                                )
                        )
                        .and(
                                CenterCoverageOfficialSpecs.started(
                                        started
                                )
                        )
                        .and(
                                CenterCoverageOfficialSpecs.completed(
                                        completed
                                )
                        );


        /*
         * Operational authorization.
         *
         * CenterCoverageOfficial is a CENTER-level view, but unlike the
         * candidate-center views it does not expose countyId or districtId.
         *
         * ORGANIZATION
         *     -> all centers for the election
         *
         * CENTER
         *     -> assigned center(s) only
         *
         * MULTI_COUNTY / COUNTY / DISTRICT
         *     -> denied for now because the current view cannot safely
         *        express descendant-center filtering from those scopes
         *
         * PLACE
         *     -> denied because center-level coverage includes other
         *        places inside the same center
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

                case CENTER ->
                        spec = spec.and(
                                CenterCoverageOfficialSpecs.centerIn(
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