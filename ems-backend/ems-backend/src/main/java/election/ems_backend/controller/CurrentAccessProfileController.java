package election.ems_backend.controller;

import election.ems_backend.dto.CurrentAccessProfileDto;
import election.ems_backend.policy.EmsAuthorizationPolicy;
import election.ems_backend.policy.EmsPortal;
import election.ems_backend.security.AuthorizationService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.server.ResponseStatusException;

import java.util.Set;

/**
 * ========================================================================
 * CURRENT ACCESS PROFILE CONTROLLER
 * ========================================================================
 *
 * Resolves the authenticated user's frontend portal in the current
 * organization context.
 *
 * ENDPOINT:
 *
 *     GET /api/access/me
 *
 * This endpoint does NOT require an election.
 *
 * PORTAL:
 *
 *     ADMINISTRATIVE
 *         -> /dashboard
 *
 *     OPERATIONS
 *         -> /operations
 *
 * Election-specific assignment/scope is resolved separately when an
 * election-scoped resource is requested.
 *
 * SECURITY:
 *
 * This endpoint does not grant resource permissions.
 * Every real API continues to authorize independently.
 * ========================================================================
 */
@RestController
@RequestMapping("/api/access")
@RequiredArgsConstructor
public class CurrentAccessProfileController {

    private final AuthorizationService authz;

    private final EmsAuthorizationPolicy authorizationPolicy;

    // ========================================================================
    // CURRENT ACCESS PROFILE
    // ========================================================================

    @GetMapping("/me")
    public CurrentAccessProfileDto currentAccess(
            Authentication authentication
    ) {

        // --------------------------------------------------------------------
        // AUTHENTICATION
        // --------------------------------------------------------------------

        if (
                authentication == null
                        || !authentication.isAuthenticated()
                        || authentication instanceof AnonymousAuthenticationToken
        ) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required"
            );
        }

        /*
         * Resolve the actual current organization membership.
         *
         * SYSTEM_ADMIN receives the existing synthetic system membership.
         *
         * Tenant/NEC users must have a valid enabled membership in the current
         * organization context.
         */
        authz.requireMembership();

        // --------------------------------------------------------------------
        // ROLE / PORTAL
        // --------------------------------------------------------------------

        Set<String> roles =
                authorizationPolicy.currentRoles();

        EmsPortal portal =
                authorizationPolicy.currentPortal();

        return CurrentAccessProfileDto
                .builder()
                .roles(roles)
                .administrativeRole(
                        authorizationPolicy.canAccessAdministrativePortal()
                )
                .operationalRole(
                        authorizationPolicy.canAccessOperationsPortal()
                )
                .portal(portal)
                .defaultRoute(
                        authorizationPolicy.defaultPortalRoute()
                )
                .build();
    }
}