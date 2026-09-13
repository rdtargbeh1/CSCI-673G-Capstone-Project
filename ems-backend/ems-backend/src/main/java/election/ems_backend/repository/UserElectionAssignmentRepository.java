package election.ems_backend.repository;

import election.ems_backend.entity.UserElectionAssignment;
import election.ems_backend.enums.AssignmentScope;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserElectionAssignmentRepository
        extends JpaRepository<UserElectionAssignment, UUID> {


    // ========================================================================
    // USER + ORGANIZATION + ELECTION
    // ========================================================================

    List<UserElectionAssignment>
    findByUser_UserIdAndOrganization_OrgIdAndElection_ElectionIdAndIsActiveTrue(
            UUID userId,
            UUID orgId,
            UUID electionId
    );


    // ========================================================================
    // ORGANIZATION + ELECTION - ACTIVE ASSIGNMENT LIST
    // ========================================================================

    List<UserElectionAssignment>
    findByOrganization_OrgIdAndElection_ElectionIdAndIsActiveTrueOrderByDateCreatedDesc(
            UUID orgId,
            UUID electionId
    );


    // ========================================================================
    // SCOPE
    // ========================================================================

    List<UserElectionAssignment>
    findByUser_UserIdAndOrganization_OrgIdAndElection_ElectionIdAndScopeTypeAndIsActiveTrue(
            UUID userId,
            UUID orgId,
            UUID electionId,
            AssignmentScope scopeType
    );


    // ========================================================================
    // ACTIVE ASSIGNMENT EXISTS
    // ========================================================================

    boolean
    existsByUser_UserIdAndOrganization_OrgIdAndElection_ElectionIdAndIsActiveTrue(
            UUID userId,
            UUID orgId,
            UUID electionId
    );


    // ========================================================================
    // COUNTY
    // ========================================================================

    boolean
    existsByUser_UserIdAndOrganization_OrgIdAndElection_ElectionIdAndScopeTypeAndCounty_CountyIdAndIsActiveTrue(
            UUID userId,
            UUID orgId,
            UUID electionId,
            AssignmentScope scopeType,
            UUID countyId
    );


    // ========================================================================
    // CENTER
    // ========================================================================

    boolean
    existsByUser_UserIdAndOrganization_OrgIdAndElection_ElectionIdAndScopeTypeAndCenter_CenterIdAndIsActiveTrue(
            UUID userId,
            UUID orgId,
            UUID electionId,
            AssignmentScope scopeType,
            UUID centerId
    );


    // ========================================================================
    // DIRECT LOOKUP
    // ========================================================================

    Optional<UserElectionAssignment>
    findByAssignmentIdAndIsActiveTrue(
            UUID assignmentId
    );
}