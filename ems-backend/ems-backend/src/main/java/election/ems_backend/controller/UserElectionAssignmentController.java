package election.ems_backend.controller;

import election.ems_backend.dto.UserElectionAssignmentDto;
import election.ems_backend.dto.UserElectionAssignmentRequest;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.service.implement.UserElectionAssignmentServiceImplementation;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;


/**
 * ========================================================================
 * USER ELECTION ASSIGNMENT CONTROLLER
 * ========================================================================
 *
 * Administrative API for configuring Operations geographic assignments.
 *
 *
 * PURPOSE
 *
 * Determines WHERE a user is authorized to operate during a specific
 * election.
 *
 *
 * ASSIGNMENT SCOPES
 *
 * ORGANIZATION
 *     -> full organization access
 *
 * MULTI_COUNTY
 *     -> multiple assigned counties
 *
 * COUNTY
 *     -> one county
 *
 * DISTRICT
 *     -> one district
 *
 * CENTER
 *     -> one or more polling centers
 *
 * PLACE
 *     -> one polling place
 *
 *
 * IMPORTANT
 *
 * This controller manages assignment configuration.
 *
 * It does NOT handle vote submissions.
 *
 * Operations submission access consumes these assignments through:
 *
 *     OperationAccessPolicy
 *     OperationSubmissionAccessPolicy
 *     OperationSubmissionActionPolicy
 *
 *
 * SECURITY
 *
 * Assignment management is administrative.
 *
 * Field users must not be able to assign or reassign themselves.
 * ========================================================================
 */
@RestController
@RequestMapping("/api/user-election-assignments")
@RequiredArgsConstructor
public class UserElectionAssignmentController {

    private final AuthorizationService authz;

    private final UserElectionAssignmentServiceImplementation assignmentService;


    // ========================================================================
    // ASSIGN / REPLACE
    // ========================================================================

    /**
     * Creates or replaces the active assignment set for:
     *
     * user + organization + election
     *
     * Examples:
     *
     * PLACE
     *     -> one row
     *
     * CENTER
     *     -> one or more rows
     *
     * MULTI_COUNTY
     *     -> multiple rows
     *
     * Existing active assignments for the same user/org/election are
     * deactivated by the service before the new assignment set is saved.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.OK)
    public List<UserElectionAssignmentDto> assign(
            @Valid
            @RequestBody
            UserElectionAssignmentRequest request
    ) {

        requireAssignmentAdmin();


        return assignmentService.assign(
                request
        );
    }


    // ========================================================================
    // LIST ACTIVE ASSIGNMENTS
    // ========================================================================

    /**
     * Returns all active assignment rows for one organization/election.
     *
     * Used by the administrative User Assignments list page.
     *
     * Example:
     *
     * GET
     * /api/user-election-assignments/list
     *     ?orgId=...
     *     &electionId=...
     *
     * Multiple physical rows may belong to one logical user assignment.
     *
     * Examples:
     *
     * MULTI_COUNTY
     *     -> multiple rows for the same user
     *
     * CENTER
     *     -> one or more rows for the same user
     *
     * The frontend groups those rows by:
     *
     * user + organization + election
     */
    @GetMapping("/list")
    public List<UserElectionAssignmentDto> listActiveAssignments(
            @RequestParam UUID orgId,
            @RequestParam UUID electionId
    ) {

        requireAssignmentAdmin();


        return assignmentService.findActiveAssignments(
                orgId,
                electionId
        );
    }


    // ========================================================================
    // GET ACTIVE ASSIGNMENT SET
    // ========================================================================

    /**
     * Returns all active assignment rows for one user in one
     * organization/election.
     *
     * A result may contain:
     *
     * one row:
     *     ORGANIZATION
     *     COUNTY
     *     DISTRICT
     *     PLACE
     *
     * multiple rows:
     *     MULTI_COUNTY
     *     CENTER
     */
    @GetMapping
    public List<UserElectionAssignmentDto> getActiveAssignments(
            @RequestParam UUID userId,
            @RequestParam UUID orgId,
            @RequestParam UUID electionId
    ) {

        requireAssignmentAdmin();


        return assignmentService.findActiveAssignments(
                userId,
                orgId,
                electionId
        );
    }


    // ========================================================================
    // GET ACTIVE ASSIGNMENT SET - USER PATH
    // ========================================================================

    /**
     * Convenience endpoint for an admin user-management screen.
     *
     * Example:
     *
     * GET
     * /api/user-election-assignments/users/{userId}
     *     ?orgId=...
     *     &electionId=...
     */
    @GetMapping("/users/{userId}")
    public List<UserElectionAssignmentDto> getUserAssignments(
            @PathVariable UUID userId,
            @RequestParam UUID orgId,
            @RequestParam UUID electionId
    ) {

        requireAssignmentAdmin();


        return assignmentService.findActiveAssignments(
                userId,
                orgId,
                electionId
        );
    }


    // ========================================================================
    // DEACTIVATE ASSIGNMENT SET
    // ========================================================================

    /**
     * Deactivates the entire active assignment set for:
     *
     * user + organization + election
     *
     * This is intentionally assignment-set based rather than deleting
     * individual rows because one logical assignment may contain several
     * rows for CENTER or MULTI_COUNTY.
     */
    @DeleteMapping
    public ResponseEntity<Void> deactivateAssignments(
            @RequestParam UUID userId,
            @RequestParam UUID orgId,
            @RequestParam UUID electionId
    ) {

        requireAssignmentAdmin();


        assignmentService.deactivateAssignments(
                userId,
                orgId,
                electionId
        );


        return ResponseEntity.noContent().build();
    }


    // ========================================================================
    // DEACTIVATE ASSIGNMENT SET - USER PATH
    // ========================================================================

    /**
     * Convenience form for the admin user-management UI.
     */
    @DeleteMapping("/users/{userId}")
    public ResponseEntity<Void> deactivateUserAssignments(
            @PathVariable UUID userId,
            @RequestParam UUID orgId,
            @RequestParam UUID electionId
    ) {

        requireAssignmentAdmin();


        assignmentService.deactivateAssignments(
                userId,
                orgId,
                electionId
        );


        return ResponseEntity.noContent().build();
    }


    // ========================================================================
    // ADMIN AUTHORIZATION
    // ========================================================================

    /**
     * Centralized controller-level authorization for assignment management.
     *
     * Field Operations users must never be allowed to configure their
     * own geographic assignment.
     */
    private void requireAssignmentAdmin() {

        authz.requireAny(
                "SYSTEM_ADMIN",
                "TENANT_ADMIN",
                "NEC_ADMIN",
                "ADMIN"
        );
    }
}