package election.ems_backend.repository;


import election.ems_backend.entity.VoteSubmission;
import election.ems_backend.enums.VoteStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VoteSubmissionRepository
        extends JpaRepository<VoteSubmission, UUID>, JpaSpecificationExecutor<VoteSubmission> {


    // Basic integrity / idempotency lookup
    boolean existsBySubmissionHash(String submissionHash);

    Optional<VoteSubmission> findByIdempotencyKey(String idempotencyKey);

    // Common list queries
    List<VoteSubmission> findByOrganization_OrgIdAndElection_ElectionIdAndStatus(
            UUID orgId,
            UUID electionId,
            VoteStatus status
    );

    /**
     * List submissions for an election by status (soft-delete aware).
     * NOTE: fixed parameter type to VoteStatus (was String).
     */
    List<VoteSubmission> findByElection_ElectionIdAndStatusAndDateDeletedIsNull(
            UUID electionId,
            VoteStatus status
    );



    /**
     * Org Queue: Missing tally sheet count for election & org.
     * ✅ Used by Overview -> "Missing tally sheet"
     *
     * Definition:
     * - submission is missing tally sheet if there is NO row in tally_sheet for (org_id, submission_id)
     * - typically only count PENDING/FLAGGED (and optionally DRAFT if your evidence policy requires)
     *
     * Implementation notes:
     * - Native query for fast join and to avoid entity relationship requirements.
     * - Pass statuses as List<String> e.g. List.of("PENDING","FLAGGED") (and "DRAFT" if used).
     */
    @Query(value = """
        select count(*)
        from vote_submission vs
        left join tally_sheet ts
          on ts.submission_id = vs.submission_id
         and ts.org_id = vs.org_id
        where vs.election_id = :electionId
          and vs.org_id = :orgId
          and vs.date_deleted is null
          and vs.status in (:statuses)
          and ts.upload_id is null
    """, nativeQuery = true)
    long countMissingTallySheets(
            @Param("electionId") UUID electionId,
            @Param("orgId") UUID orgId,
            @Param("statuses") List<String> statuses
    );

    // ---------------------------------------------------------------------
    // Overview - Grouped status counts (better than N calls)
    // ---------------------------------------------------------------------

    /**
     * Projection for grouped status counts.
     * Avoids Object[] casting.
     */
    interface StatusCountRow {
        String getStatus();
        long getCt();
    }

    /**
     * Overview KPI: Count submissions grouped by status (org + election).
     * ✅ Used to build Operational Queues + Submission Health cards with one DB call.
     *
     * Returns rows like:
     * - status="PENDING", ct=14
     * - status="VERIFIED", ct=6
     */
    @Query(value = """
        select vs.status as status, count(*) as ct
        from vote_submission vs
        where vs.election_id = :electionId
          and vs.org_id = :orgId
          and vs.date_deleted is null
        group by vs.status
    """, nativeQuery = true)
    List<StatusCountRow> countByStatusGrouped(
            @Param("electionId") UUID electionId,
            @Param("orgId") UUID orgId
    );

    // ---------------------------------------------------------------------
    // Overview - Freshness + activity windows
    // ---------------------------------------------------------------------

    /**
     * Overview KPI: Last submission time (org + election).
     * Useful for "Last updated" and data freshness.
     */
    @Query("""
        select max(vs.submissionTime)
        from VoteSubmission vs
        where vs.election.electionId = :electionId
          and vs.organization.orgId = :orgId
          and vs.dateDeleted is null
    """)
    LocalDateTime findLastSubmissionTime(
            @Param("electionId") UUID electionId,
            @Param("orgId") UUID orgId
    );

    /**
     * Overview KPI: Count submissions created since timestamp (org + election).
     * Used for "last 24h" / "last 7d" activity stats.
     */
    @Query("""
        select count(vs)
        from VoteSubmission vs
        where vs.election.electionId = :electionId
          and vs.organization.orgId = :orgId
          and vs.dateDeleted is null
          and vs.submissionTime >= :since
    """)
    long countSubmittedSince(
            @Param("electionId") UUID electionId,
            @Param("orgId") UUID orgId,
            @Param("since") LocalDateTime since
    );

    /**
     * Overview KPI: Count verified submissions since timestamp (org + election).
     * Uses dateVerified as the time dimension.
     */
    @Query("""
        select count(vs)
        from VoteSubmission vs
        where vs.election.electionId = :electionId
          and vs.organization.orgId = :orgId
          and vs.dateDeleted is null
          and vs.status = election.ems_backend.enums.VoteStatus.VERIFIED
          and vs.dateVerified is not null
          and vs.dateVerified >= :since
    """)
    long countVerifiedSince(
            @Param("electionId") UUID electionId,
            @Param("orgId") UUID orgId,
            @Param("since") LocalDateTime since
    );


    /**
     * Overview KPI: Distinct centers that have at least one submission (org + election).
     * Useful for "coverage" tracking.
     */
    @Query("""
        select count(distinct vs.pollingCenter.centerId)
        from VoteSubmission vs
        where vs.election.electionId = :electionId
          and vs.organization.orgId = :orgId
          and vs.dateDeleted is null
    """)
    long countDistinctCentersWithSubmissions(
            @Param("electionId") UUID electionId,
            @Param("orgId") UUID orgId
    );

    /**
     * Overview KPI: Distinct places that have at least one submission (org + election).
     */
    @Query("""
        select count(distinct vs.pollingPlace.placeId)
        from VoteSubmission vs
        where vs.election.electionId = :electionId
          and vs.organization.orgId = :orgId
          and vs.dateDeleted is null
    """)
    long countDistinctPlacesWithSubmissions(
            @Param("electionId") UUID electionId,
            @Param("orgId") UUID orgId
    );


    @Query("""
            select vs
            from VoteSubmission vs
            where vs.organization.orgId = :necOrgId
              and vs.election.electionId = :electionId
              and vs.contestId = :contestId
              and vs.pollingCenter.centerId = :centerId
              and vs.status = election.ems_backend.enums.VoteStatus.VERIFIED
              and vs.dateDeleted is null
            """)
    List<VoteSubmission> findVerifiedForNecCenter(UUID necOrgId, UUID electionId, UUID contestId, UUID centerId);

    List<VoteSubmission> findAllByOrganization_OrgIdAndElection_ElectionIdAndContestIdAndPollingCenter_CenterIdAndStatusAndDateDeletedIsNull(
            UUID orgId,
            UUID electionId,
            UUID contestId,
            UUID centerId,
            VoteStatus status
    );



    // ✅ NEW: enforce “one submission per contest per polling place” (soft delete aware)
    boolean existsByOrganization_OrgIdAndElection_ElectionIdAndPollingPlace_PlaceIdAndContestIdAndDateDeletedIsNull(
            UUID orgId, UUID electionId, UUID placeId, UUID contestId
    );


    Optional<VoteSubmission> findBySubmissionHash(String submissionHash);

    Optional<VoteSubmission> findFirstByOrganization_OrgIdAndElection_ElectionIdAndPollingCenter_CenterIdAndAgent_UserIdOrderBySubmissionTimeDesc(
            UUID orgId,
            UUID electionId,
            UUID centerId,
            UUID agentId
    );


    // Overview - Org operational queue counts
    /**
     * Org Queue: Count submissions by status for an election & org.
     * ✅ Used by Overview -> Pending / Flagged / Rejected / Verified / (Draft if added)
     *
     * @param electionId election scope
     * @param orgId tenant scope
     * @param status VoteStatus enum
     */
    long countByElection_ElectionIdAndOrganization_OrgIdAndStatusAndDateDeletedIsNull(
            UUID electionId,
            UUID orgId,
            VoteStatus status
    );

    /**
     * Org Queue: Count ALL submissions for election & org (soft-delete aware).
     * Useful for total submission KPI.
     */
    long countByElection_ElectionIdAndOrganization_OrgIdAndDateDeletedIsNull(
            UUID electionId,
            UUID orgId
    );

}
