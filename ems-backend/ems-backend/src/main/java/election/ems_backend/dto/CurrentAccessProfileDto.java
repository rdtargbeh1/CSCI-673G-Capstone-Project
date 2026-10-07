package election.ems_backend.dto;

import election.ems_backend.policy.EmsPortal;

import lombok.Builder;
import lombok.Getter;

import java.util.Set;

/**
 * ========================================================================
 * CURRENT ACCESS PROFILE DTO
 * ========================================================================
 *
 * Portal-level access information for the authenticated user in the current
 * organization context.
 *
 * IMPORTANT:
 *
 * This DTO intentionally contains NO:
 *
 * - electionId
 * - countyId
 * - districtId
 * - centerId
 * - placeId
 *
 * Those belong to election/resource authorization, not portal selection.
 *
 * The frontend may use this DTO for:
 *
 * - login/root redirect
 * - selecting the correct application portal
 * - selecting the correct sidebar
 * - preventing operational users from entering administrative workspaces
 *
 * This DTO is informational.
 *
 * Backend resource endpoints remain the security authority.
 * ========================================================================
 */
@Getter
@Builder
public class CurrentAccessProfileDto {

    private Set<String> roles;

    private boolean administrativeRole;

    private boolean operationalRole;

    private EmsPortal portal;

    private String defaultRoute;
}