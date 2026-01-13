package election.ems_backend.repository;

import election.ems_backend.entity.ContestOption;
import election.ems_backend.enums.ContestOptionType;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.*;

/**
 * Minimal repository used to resolve candidate -> contest option mapping.
 * Assumes ContestOption entity exists and has candidateId property.
 */

@Repository
public interface ContestOptionRepository extends JpaRepository<ContestOption, UUID> {

    List<ContestOption> findByContestIdOrderByOptionOrderAsc(UUID contestId);

    List<ContestOption> findByContestIdAndIsActiveTrueOrderByOptionOrderAsc(UUID contestId);

    List<ContestOption> findByElectId(UUID electId);

    Optional<ContestOption> findByContestIdAndElectId(UUID contestId, UUID electId);

    boolean existsByContestIdAndElectId(UUID contestId, UUID electId);


    @Query("""
        select coalesce(max(o.optionOrder), 0)
        from ContestOption o
        where o.contestId = :contestId
    """)
    int maxOrder(@Param("contestId") UUID contestId);


    @Query("""
        select o
        from ContestOption o
        where o.contestId = :contestId
          and o.optionType = :type
    """)
    List<ContestOption> findByContestIdAndOptionType(
            @Param("contestId") UUID contestId,
            @Param("type") ContestOptionType type
    );


    @Query("""
        select co
        from ContestOption co
        join Contest c on c.contestId = co.contestId
        where co.electId = :electId
          and c.electionId = :electionId
          and co.isActive = true
          and c.isActive = true
    """)
    List<ContestOption> findActiveByElectIdAndElectionId(
            @Param("electId") UUID electId,
            @Param("electionId") UUID electionId
    );


    @Query("""
    select co.electId
    from ContestOption co
    where co.contestId = :contestId
      and co.isActive = true
      and co.optionType = Backend.ElectionVote.enums.ContestOptionType.CANDIDATE
      and co.electId is not null
""")
    Set<UUID> findActiveCandidateElectIdsByContestId(@Param("contestId") UUID contestId);


    @Modifying
    @Transactional
    @Query(value = """
    WITH ranked AS (
        SELECT option_id,
               ROW_NUMBER() OVER (ORDER BY option_order ASC, date_created ASC) AS rn
        FROM contest_option
        WHERE contest_id = :contestId
    )
    UPDATE contest_option co
    SET option_order = ranked.rn
    FROM ranked
    WHERE co.option_id = ranked.option_id
""", nativeQuery = true)
    int resequenceOptionOrder(@Param("contestId") UUID contestId);


    @Query("""
        select o
        from ContestOption o
        where o.contestId = :contestId
          and o.optionType = :type
          and o.electId in :electIds
    """)
    List<ContestOption> findCandidateOptionsIn(
            @Param("contestId") UUID contestId,
            @Param("type") ContestOptionType type,
            @Param("electIds") Collection<UUID> electIds
    );

    @Query("select coalesce(max(c.optionOrder), 0) from ContestOption c where c.contestId = ?1")
    Integer findMaxOptionOrderForContest(UUID contestId);


    boolean existsByContestIdAndElectIdAndIsActiveTrue(UUID contestId, UUID electId);


    /**
     * Readiness helper: Count active options for a contest.
     *
     * @param contestId contest scope
     * @return number of active options
     */
    @Query("""
        select count(co)
        from ContestOption co
        where co.contestId = :contestId
          and co.isActive = true
    """)
    long countActiveByContestId(@Param("contestId") UUID contestId);

    // ✅ when JSON keys are option_id
    List<ContestOption> findByContestIdAndOptionIdIn(UUID contestId, Collection<UUID> optionIds);

    // ✅ when JSON keys are elect_id (ElectionCandidate FK)
    List<ContestOption> findByContestIdAndElectIdIn(UUID contestId, Collection<UUID> electIds);


}