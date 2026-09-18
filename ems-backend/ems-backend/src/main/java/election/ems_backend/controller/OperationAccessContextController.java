package election.ems_backend.controller;

import election.ems_backend.dto.OperationAccessContextDto;

import election.ems_backend.enums.AssignmentScope;

import election.ems_backend.policy.OperationAccessPolicy;

import election.ems_backend.security.AuthorizationService;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * ========================================================================
 * OPERATION ACCESS CONTEXT CONTROLLER
 * ========================================================================
 *
 * PURPOSE
 *
 * Exposes the authenticated user's effective Operations assignment context
 * for one election.
 *
 * This is NOT an assignment-management endpoint.
 *
 * It does not allow:
 *
 * - assigning users
 * - changing scope
 * - reading another user's assignments
 * - expanding authority
 *
 * The endpoint only reports the effective scope already resolved by the
 * backend Operations authorization policy.
 *
 * ENDPOINT
 *
 * GET /api/operations/access-context?electionId={electionId}
 * ========================================================================
 */
@RestController
@RequestMapping("/api/operations/access-context")
@RequiredArgsConstructor
public class OperationAccessContextController {

    private final AuthorizationService authz;

    private final OperationAccessPolicy operationAccessPolicy;


    // ========================================================================
    // CURRENT USER ACCESS CONTEXT
    // ========================================================================

    @GetMapping
    public OperationAccessContextDto getCurrentAccessContext(
            @RequestParam
            UUID electionId
    ) {

        authz.requireMembership();


        boolean operationalAccess =
                operationAccessPolicy.hasOperationalAccess(
                        electionId
                );


        AssignmentScope scope =
                operationalAccess
                        ? operationAccessPolicy.currentScope(
                        electionId
                )
                        : null;


        return OperationAccessContextDto
                .builder()
                .electionId(
                        electionId
                )
                .operationalAccess(
                        operationalAccess
                )
                .scopeType(
                        scope
                )
                .build();
    }
}