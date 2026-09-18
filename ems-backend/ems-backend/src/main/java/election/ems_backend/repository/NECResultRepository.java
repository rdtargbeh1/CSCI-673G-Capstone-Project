package election.ems_backend.repository;

import election.ems_backend.entity.NECResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NECResultRepository extends JpaRepository<NECResult, UUID>, JpaSpecificationExecutor<NECResult> {

    Optional<NECResult> findByElection_ElectionIdAndPollingCenter_CenterId(UUID electionId, UUID centerId);

    boolean existsByElection_ElectionIdAndContest_ContestIdAndPollingCenter_CenterId(
            UUID electionId,
            UUID contestId,
            UUID centerId
    );

    boolean existsByElection_ElectionIdAndContest_ContestIdAndPollingCenter_CenterIdAndIsPublishedTrue(
            UUID electionId,
            UUID contestId,
            UUID centerId
    );

    // Scalar sums
    @Query(value = """
    SELECT
      COALESCE(SUM(ballots_cast), 0)            AS ballots_cast,
      COALESCE(SUM(invalid_ballots), 0)         AS invalid_ballots,
      COALESCE(SUM(blank_ballots), 0)           AS blank_ballots,
      COALESCE(SUM(rejected_ballots), 0)        AS rejected_ballots,
      COALESCE(SUM(spoiled_ballots), 0)         AS spoiled_ballots,
      COALESCE(SUM(total_registered_voters), 0) AS registered_voters
    FROM nec_result
    WHERE election_id = :electionId
      AND (:centerId IS NULL OR center_id = :centerId)
    """, nativeQuery = true)
    Map<String, Object> sumScalarColumns(@Param("electionId") UUID electionId, @Param("centerId") UUID centerId);



    // Total candidate votes across JSONB
    @Query(value = """
        SELECT COALESCE(SUM((kv.value)::bigint), 0) AS total_candidate_votes
        FROM nec_result nr
        CROSS JOIN LATERAL jsonb_each_text(nr.candidate_votes) kv(key, value)
        WHERE nr.election_id = :electionId
          AND (:centerId IS NULL OR nr.center_id = :centerId)
        """, nativeQuery = true)
    BigInteger sumAllCandidateVotes(@Param("electionId") UUID electionId, @Param("centerId") UUID centerId);


    // Overall per-candidate (optionally filter by center)
    @Query(value = """
    WITH kv AS (
      SELECT
        (j.key)::uuid     AS candidate_id,
        (j.value)::bigint AS votes,
        nr.ballots_cast,
        nr.invalid_ballots, nr.blank_ballots, nr.rejected_ballots, nr.spoiled_ballots
      FROM nec_result nr
      CROSS JOIN LATERAL jsonb_each_text(nr.candidate_votes) AS j(key, value)
      WHERE nr.election_id = :electionId
        AND (:centerId IS NULL OR nr.center_id = :centerId)
    )
    SELECT candidate_id,
           SUM(votes)            AS votes,
           SUM(ballots_cast)     AS ballots_cast,
           SUM(invalid_ballots)  AS invalid_ballots,
           SUM(blank_ballots)    AS blank_ballots,
           SUM(rejected_ballots) AS rejected_ballots,
           SUM(spoiled_ballots)  AS spoiled_ballots
    FROM kv
    GROUP BY candidate_id
    ORDER BY votes DESC
    """, nativeQuery = true)
    List<Object[]> overallByCandidate(@Param("electionId") UUID electionId,
                                      @Param("centerId") UUID centerId);

    // Per-candidate by county
    @Query(value = """
    WITH kv AS (
      SELECT c.county_id, c.county_name,
             (j.key)::uuid AS candidate_id,
             (j.value)::bigint AS votes,
             nr.total_registered_voters
      FROM nec_result nr
      JOIN polling_center pc ON pc.polling_center_id = nr.center_id
      JOIN district d ON d.district_id = pc.district_id
      JOIN county c ON c.county_id = d.county_id
      CROSS JOIN LATERAL jsonb_each_text(nr.candidate_votes) j(key, value)
      WHERE nr.election_id = :electionId
    )
    SELECT county_id, county_name, candidate_id,
           SUM(votes) AS votes,
           SUM(total_registered_voters) AS registered_voters
    FROM kv
    GROUP BY county_id, county_name, candidate_id
    ORDER BY county_name, votes DESC
    """, nativeQuery = true)
    List<Object[]> byCountyPerCandidate(@Param("electionId") UUID electionId);


    // Per-candidate by district (optionally within a county)
    @Query(value = """
    WITH kv AS (
      SELECT d.district_id, d.district_name,
             (j.key)::uuid AS candidate_id,
             (j.value)::bigint AS votes,
             nr.total_registered_voters
      FROM nec_result nr
      JOIN polling_center pc ON pc.polling_center_id = nr.center_id
      JOIN district d ON d.district_id = pc.district_id
      CROSS JOIN LATERAL jsonb_each_text(nr.candidate_votes) j(key, value)
      WHERE nr.election_id = :electionId
        AND (:countyId IS NULL OR d.county_id = :countyId)
    )
    SELECT district_id, district_name, candidate_id,
           SUM(votes) AS votes,
           SUM(total_registered_voters) AS registered_voters
    FROM kv
    GROUP BY district_id, district_name, candidate_id
    ORDER BY district_name, votes DESC
    """, nativeQuery = true)
    List<Object[]> byDistrictPerCandidate(@Param("electionId") UUID electionId, @Param("countyId") UUID countyId);



    // Daily per-candidate (upload_time::date)
    @Query(value = """
    WITH kv AS (
      SELECT date_trunc('day', nr.upload_time)::date AS day,
             (j.key)::uuid AS candidate_id,
             (j.value)::bigint AS votes,
             nr.ballots_cast,
             nr.total_registered_voters
      FROM nec_result nr
      CROSS JOIN LATERAL jsonb_each_text(nr.candidate_votes) j(key, value)
      WHERE nr.election_id = :electionId
        AND nr.upload_time IS NOT NULL
    )
    SELECT day, candidate_id,
           SUM(votes) AS votes,
           SUM(ballots_cast) AS ballots_cast,
           SUM(total_registered_voters) AS registered_voters
    FROM kv
    GROUP BY day, candidate_id
    ORDER BY day ASC, votes DESC
    """, nativeQuery = true)
    List<Object[]> dailyByCandidate(@Param("electionId") UUID electionId);


    @Query("""
        select (count(r) > 0)
        from NECResult r
        where r.election.electionId = :electionId
          and (:contestId is null or r.contest.contestId = :contestId)
          and r.isPublished = true
    """)
    boolean existsPublished(@Param("electionId") UUID electionId,
                            @Param("contestId") UUID contestId);



    @Modifying
    @Query("""
        UPDATE NECResult nr
           SET nr.isPublished = true,
               nr.publishedAt = CURRENT_TIMESTAMP
         WHERE nr.election.electionId = :electionId
        """)
    int publishElectionResults(UUID electionId);

    /**
     * NEC Workflow: Count published official results for an election.
     * ✅ Used by Overview -> "Official published"
     *
     * Notes:
     * - Assumes NECResult has boolean field isPublished (or is_published column mapped).
     *
     * @param electionId election scope
     * @return published rows count
     */
    @Query("""
            select count(nr) 
            from NECResult nr 
            where nr.election.electionId = :electionId  
            and nr.isPublished = true 
            """)
    long countPublishedByElectionId(@Param("electionId") UUID electionId);


    Optional<NECResult> findByElection_ElectionIdAndContest_ContestIdAndPollingCenter_CenterId(
            UUID electionId,
            UUID contestId,
            UUID centerId
    );

    List<NECResult> findByElection_ElectionId(UUID electionId);

    /**
     * Only published results whose publishedUntil is expired.
     * We return resultIds to keep the scheduled job light and avoid heavy entity graphs.
     */
    @Query("""
        select nr.resultId
          from NECResult nr
         where nr.isPublished = true
           and nr.publishedUntil is not null
           and nr.publishedUntil <= :now
    """)
    List<UUID> findExpiredPublishedResultIds(LocalDateTime now);


    @Modifying
    @Query("""
        UPDATE NECResult r
           SET r.isPublished = false,
               r.publishedAt = null,
               r.publishedUntil = null,
               r.resultSignature = null,
               r.resultSignerKeyId = null,
               r.chainHash = null
         WHERE r.isPublished = true
           AND r.publishedUntil IS NOT NULL
           AND r.publishedUntil <= :now
    """)
    int autoUnpublishExpired(@Param("now") LocalDateTime now);



    @Modifying
    @Query("""
  delete from NECResult nr
  where nr.election.electionId = :electionId
    and nr.contest.contestId = :contestId
    and nr.pollingCenter.centerId = :centerId
""")
    int deleteByScope(@Param("electionId") UUID electionId,
                      @Param("contestId") UUID contestId,
                      @Param("centerId") UUID centerId);


}