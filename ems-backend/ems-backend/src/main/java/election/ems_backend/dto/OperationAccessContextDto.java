package election.ems_backend.dto;

import election.ems_backend.enums.AssignmentScope;

import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

/**
 * ========================================================================
 * OPERATION ACCESS CONTEXT DTO
 * ========================================================================
 *
 * Read-only effective Operations context for the authenticated user.
 *
 * PURPOSE
 *
 * Allows the frontend to understand the user's effective election
 * assignment without exposing administrative assignment-management APIs.
 *
 * SECURITY
 *
 * This DTO is informational only.
 *
 * It does not replace backend authorization.
 * All resource/action endpoints must continue to enforce:
 *
 * role
 * organization
 * election
 * assignment scope
 * resource geography
 * ownership
 * workflow state
 * ========================================================================
 */
@Getter
@Builder
public class OperationAccessContextDto {

    private UUID electionId;

    private boolean operationalAccess;

    private AssignmentScope scopeType;
}