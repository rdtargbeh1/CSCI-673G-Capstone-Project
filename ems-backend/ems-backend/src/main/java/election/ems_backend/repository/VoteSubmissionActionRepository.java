package election.ems_backend.repository;

import election.ems_backend.entity.VoteSubmissionAction;
import election.ems_backend.enums.VoteSubmissionActionType;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface VoteSubmissionActionRepository
        extends JpaRepository<VoteSubmissionAction, UUID> {

    // ========================================================================
    // SUBMISSION HISTORY
    // ========================================================================

    List<VoteSubmissionAction>
    findBySubmission_SubmissionIdOrderByActionTimeDesc(
            UUID submissionId
    );

    List<VoteSubmissionAction>
    findByOrganization_OrgIdAndSubmission_SubmissionIdOrderByActionTimeDesc(
            UUID orgId,
            UUID submissionId
    );

    List<VoteSubmissionAction>
    findBySubmission_SubmissionIdAndActionTypeOrderByActionTimeDesc(
            UUID submissionId,
            VoteSubmissionActionType actionType
    );

    // ========================================================================
    // ACTOR
    // ========================================================================

    List<VoteSubmissionAction>
    findByActorUser_UserIdOrderByActionTimeDesc(
            UUID actorUserId
    );

    // ========================================================================
    // OVERSIGHT — PAGINATED
    // ========================================================================

    Page<VoteSubmissionAction>
    findAllByOrderByActionTimeDesc(
            Pageable pageable
    );

    Page<VoteSubmissionAction>
    findByOrganization_OrgIdOrderByActionTimeDesc(
            UUID orgId,
            Pageable pageable
    );

    Page<VoteSubmissionAction>
    findByActionTypeOrderByActionTimeDesc(
            VoteSubmissionActionType actionType,
            Pageable pageable
    );

    Page<VoteSubmissionAction>
    findByOrganization_OrgIdAndActionTypeOrderByActionTimeDesc(
            UUID orgId,
            VoteSubmissionActionType actionType,
            Pageable pageable
    );

    Page<VoteSubmissionAction>
    findBySubmission_SubmissionIdOrderByActionTimeDesc(
            UUID submissionId,
            Pageable pageable
    );

    Page<VoteSubmissionAction>
    findByOrganization_OrgIdAndSubmission_SubmissionIdOrderByActionTimeDesc(
            UUID orgId,
            UUID submissionId,
            Pageable pageable
    );

    long countBySubmission_SubmissionIdAndActionType(
            UUID submissionId,
            VoteSubmissionActionType actionType
    );

    // ========================================================================
    // COUNT / EXISTS
    // ========================================================================

    long countBySubmission_SubmissionId(
            UUID submissionId
    );

    boolean existsBySubmission_SubmissionIdAndActionType(
            UUID submissionId,
            VoteSubmissionActionType actionType
    );
}