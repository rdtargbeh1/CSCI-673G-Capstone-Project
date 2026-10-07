package election.ems_backend.repository;

import election.ems_backend.entity.VoteSubmission;
import election.ems_backend.enums.VoteStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;


/**
 * ========================================================================
 * OPERATION VOTE SUBMISSION REPOSITORY
 * ========================================================================
 *
 * Vote-submission queries used specifically by the Operations domain.
 *
 * This repository does NOT replace the normal VoteSubmissionRepository.
 *
 * Election Workspace:
 *     -> continues using the existing VoteSubmissionRepository
 *
 * Operations:
 *     -> uses this repository
 *     -> results are restricted by UserElectionAssignment
 *
 *
 * Geographic inheritance:
 *
 * ORGANIZATION
 *     -> all organization submissions for the election
 *
 * MULTI_COUNTY
 *     -> submissions within any assigned county
 *
 * COUNTY
 *     -> submissions within assigned county
 *
 * DISTRICT
 *     -> submissions within assigned district
 *
 * CENTER
 *     -> submissions within assigned center(s)
 *
 * PLACE
 *     -> assigned polling place
 *     -> own submissions only
 * ========================================================================
 */
public interface OperationVoteSubmissionRepository extends Repository<VoteSubmission, UUID> {


    // ========================================================================
    // SEARCH OPERATIONS SUBMISSIONS
    // ========================================================================

    @Query("""
            SELECT s
            FROM VoteSubmission s

            WHERE s.dateDeleted IS NULL

              AND s.organization.orgId = :orgId

              AND s.election.electionId = :electionId

              AND (
                    :status IS NULL
                    OR s.status = :status
              )

              AND (
                    :contestId IS NULL
                    OR s.contestId = :contestId
              )

              AND (
                    :countyId IS NULL
                    OR s.pollingCenter.district.county.countyId = :countyId
              )

              AND (
                    :districtId IS NULL
                    OR s.pollingCenter.district.districtId = :districtId
              )

              AND (
                    :centerId IS NULL
                    OR s.pollingCenter.centerId = :centerId
              )

              AND (
                    :placeId IS NULL
                    OR s.pollingPlace.placeId = :placeId
              )

              AND EXISTS (

                    SELECT a.assignmentId

                    FROM UserElectionAssignment a

                    WHERE a.user.userId = :userId

                      AND a.organization.orgId = :orgId

                      AND a.election.electionId = :electionId

                      AND a.isActive = true

                      AND (

                            (
                                a.scopeType = election.ems_backend.enums.AssignmentScope.ORGANIZATION
                            )

                            OR

                            (
                                a.scopeType = election.ems_backend.enums.AssignmentScope.MULTI_COUNTY

                                AND a.county IS NOT NULL

                                AND a.county.countyId =
                                    s.pollingCenter.district.county.countyId
                            )

                            OR

                            (
                                a.scopeType = election.ems_backend.enums.AssignmentScope.COUNTY

                                AND a.county IS NOT NULL

                                AND a.county.countyId =
                                    s.pollingCenter.district.county.countyId
                            )

                            OR

                            (
                                a.scopeType = election.ems_backend.enums.AssignmentScope.DISTRICT

                                AND a.district IS NOT NULL

                                AND a.district.districtId =
                                    s.pollingCenter.district.districtId
                            )

                            OR

                            (
                                a.scopeType = election.ems_backend.enums.AssignmentScope.CENTER

                                AND a.center IS NOT NULL

                                AND a.center.centerId =
                                    s.pollingCenter.centerId
                            )

                            OR

                            (
                                a.scopeType = election.ems_backend.enums.AssignmentScope.PLACE

                                AND a.place IS NOT NULL

                                AND a.place.placeId =
                                    s.pollingPlace.placeId

                                AND s.agent.userId = :userId
                            )
                      )
              )

            ORDER BY s.submissionTime DESC
            """)
    Page<VoteSubmission> searchOperations(
            @Param("userId") UUID userId,
            @Param("orgId") UUID orgId,
            @Param("electionId") UUID electionId,
            @Param("status") VoteStatus status,
            @Param("contestId") UUID contestId,
            @Param("countyId") UUID countyId,
            @Param("districtId") UUID districtId,
            @Param("centerId") UUID centerId,
            @Param("placeId") UUID placeId,
            Pageable pageable
    );


    // ========================================================================
    // FIND ONE WITH OPERATIONS ACCESS
    //
    // Important:
    // Do not secure only the list.
    //
    // An Operations user must not be able to copy another submission ID
    // and access it directly.
    // ========================================================================

    @Query("""
            SELECT s
            FROM VoteSubmission s

            WHERE s.submissionId = :submissionId

              AND s.dateDeleted IS NULL

              AND s.organization.orgId = :orgId

              AND EXISTS (

                    SELECT a.assignmentId

                    FROM UserElectionAssignment a

                    WHERE a.user.userId = :userId

                      AND a.organization.orgId = :orgId

                      AND a.election.electionId =
                          s.election.electionId

                      AND a.isActive = true

                      AND (

                            (
                                a.scopeType = election.ems_backend.enums.AssignmentScope.ORGANIZATION
                            )

                            OR

                            (
                                a.scopeType = election.ems_backend.enums.AssignmentScope.MULTI_COUNTY

                                AND a.county IS NOT NULL

                                AND a.county.countyId =
                                    s.pollingCenter.district.county.countyId
                            )

                            OR

                            (
                                a.scopeType = election.ems_backend.enums.AssignmentScope.COUNTY

                                AND a.county IS NOT NULL

                                AND a.county.countyId =
                                    s.pollingCenter.district.county.countyId
                            )

                            OR

                            (
                                a.scopeType = election.ems_backend.enums.AssignmentScope.DISTRICT

                                AND a.district IS NOT NULL

                                AND a.district.districtId =
                                    s.pollingCenter.district.districtId
                            )

                            OR

                            (
                                a.scopeType = election.ems_backend.enums.AssignmentScope.CENTER

                                AND a.center IS NOT NULL

                                AND a.center.centerId =
                                    s.pollingCenter.centerId
                            )

                            OR

                            (
                                a.scopeType = election.ems_backend.enums.AssignmentScope.PLACE

                                AND a.place IS NOT NULL

                                AND a.place.placeId =
                                    s.pollingPlace.placeId

                                AND s.agent.userId = :userId
                            )
                      )
              )
            """)
    Optional<VoteSubmission> findOperationSubmission(
            @Param("submissionId") UUID submissionId,
            @Param("userId") UUID userId,
            @Param("orgId") UUID orgId
    );


}