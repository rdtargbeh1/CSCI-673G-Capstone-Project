package election.ems_backend.repository;

import election.ems_backend.entity.ContestOption;
import election.ems_backend.enums.ContestOptionType;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;


/**
 * Repository for ContestOption persistence and lookup.
 *
 * Candidate option ordering:
 *
 * Candidate-based contest options are returned alphabetically by the
 * underlying Candidate.fullName.
 *
 * Relationship:
 *
 * ContestOption.elect_id
 *      ->
 * ElectionCandidate.elect_id
 *      ->
 * ElectionCandidate.candidate_id
 *      ->
 * Candidate.candidate_id
 *
 * LABEL options continue to use option_order.
 *
 * We intentionally do NOT rewrite option_order simply to display candidate
 * options alphabetically. This preserves existing database ordering semantics,
 * uniqueness constraints, and support for LABEL options.
 */
@Repository
public interface ContestOptionRepository
        extends JpaRepository<ContestOption, UUID> {


    // ========================================================================
    // EXISTING OPTION-ORDER LOOKUPS
    //
    // Retained because other backend workflows may depend on explicit
    // option_order semantics.
    // ========================================================================

    List<ContestOption> findByContestIdOrderByOptionOrderAsc(
            UUID contestId
    );


    List<ContestOption> findByContestIdAndIsActiveTrueOrderByOptionOrderAsc(
            UUID contestId
    );


    // ========================================================================
    // ALPHABETICAL CONTEST OPTION LIST
    //
    // Candidate options:
    //      Candidate.full_name ASC
    //
    // Label options:
    //      option_order ASC
    //
    // Candidate options appear before LABEL options if a contest ever contains
    // both types.
    //
    // Native SQL is used here because the actual sorting field lives two
    // relationships away:
    //
    // contest_option
    //   -> election_candidate
    //   -> candidate
    // ========================================================================

    @Query(
            value = """
                    SELECT co.*
                    FROM contest_option co

                    LEFT JOIN election_candidate ec
                           ON ec.elect_id = co.elect_id

                    LEFT JOIN candidate c
                           ON c.candidate_id = ec.candidate_id

                    WHERE co.contest_id = :contestId

                    ORDER BY

                        CASE
                            WHEN co.option_type = 'CANDIDATE'
                            THEN 0
                            ELSE 1
                        END ASC,

                        CASE
                            WHEN co.option_type = 'CANDIDATE'
                            THEN LOWER(c.full_name)
                            ELSE NULL
                        END ASC NULLS LAST,

                        CASE
                            WHEN co.option_type = 'LABEL'
                            THEN co.option_order
                            ELSE NULL
                        END ASC NULLS LAST,

                        co.option_order ASC,

                        co.date_created ASC,

                        co.option_id ASC
                    """,
            nativeQuery = true
    )
    List<ContestOption> findByContestIdAlphabetically(
            @Param("contestId") UUID contestId
    );


    // ========================================================================
    // ACTIVE-ONLY ALPHABETICAL LIST
    // ========================================================================

    @Query(
            value = """
                    SELECT co.*
                    FROM contest_option co

                    LEFT JOIN election_candidate ec
                           ON ec.elect_id = co.elect_id

                    LEFT JOIN candidate c
                           ON c.candidate_id = ec.candidate_id

                    WHERE co.contest_id = :contestId
                      AND co.is_active = true

                    ORDER BY

                        CASE
                            WHEN co.option_type = 'CANDIDATE'
                            THEN 0
                            ELSE 1
                        END ASC,

                        CASE
                            WHEN co.option_type = 'CANDIDATE'
                            THEN LOWER(c.full_name)
                            ELSE NULL
                        END ASC NULLS LAST,

                        CASE
                            WHEN co.option_type = 'LABEL'
                            THEN co.option_order
                            ELSE NULL
                        END ASC NULLS LAST,

                        co.option_order ASC,

                        co.date_created ASC,

                        co.option_id ASC
                    """,
            nativeQuery = true
    )
    List<ContestOption> findActiveByContestIdAlphabetically(
            @Param("contestId") UUID contestId
    );


    // ========================================================================
    // ELECTION CANDIDATE LOOKUPS
    // ========================================================================

    List<ContestOption> findByElectId(
            UUID electId
    );


    Optional<ContestOption> findByContestIdAndElectId(
            UUID contestId,
            UUID electId
    );


    boolean existsByContestIdAndElectId(
            UUID contestId,
            UUID electId
    );


    boolean existsByContestIdAndElectIdAndIsActiveTrue(
            UUID contestId,
            UUID electId
    );


    // ========================================================================
    // MAX ORDER
    // ========================================================================

    @Query("""
            select coalesce(max(o.optionOrder), 0)
            from ContestOption o
            where o.contestId = :contestId
            """)
    int maxOrder(
            @Param("contestId") UUID contestId
    );


    @Query("""
            select coalesce(max(c.optionOrder), 0)
            from ContestOption c
            where c.contestId = ?1
            """)
    Integer findMaxOptionOrderForContest(
            UUID contestId
    );


    // ========================================================================
    // TYPE LOOKUP
    // ========================================================================

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


    // ========================================================================
    // ACTIVE OPTION LOOKUP BY ELECTION CANDIDATE + ELECTION
    // ========================================================================

    @Query("""
            select co
            from ContestOption co
            join Contest c
              on c.contestId = co.contestId
            where co.electId = :electId
              and c.electionId = :electionId
              and co.isActive = true
              and c.isActive = true
            """)
    List<ContestOption> findActiveByElectIdAndElectionId(
            @Param("electId") UUID electId,
            @Param("electionId") UUID electionId
    );


    // ========================================================================
    // ACTIVE ELECTION CANDIDATE IDS
    // ========================================================================

    @Query("""
            select co.electId
            from ContestOption co
            where co.contestId = :contestId
              and co.isActive = true
              and co.optionType =
                  election.ems_backend.enums.ContestOptionType.CANDIDATE
              and co.electId is not null
            """)
    Set<UUID> findActiveCandidateElectIdsByContestId(
            @Param("contestId") UUID contestId
    );


    // ========================================================================
    // RESEQUENCE EXISTING OPTION ORDER
    //
    // Retained for delete behavior.
    //
    // This removes gaps from explicit option_order values.
    // It is intentionally separate from alphabetical display ordering.
    // ========================================================================

    @Modifying
    @Transactional
    @Query(
            value = """
                    WITH ranked AS (
                        SELECT
                            option_id,

                            ROW_NUMBER() OVER (
                                ORDER BY
                                    option_order ASC,
                                    date_created ASC
                            ) AS rn

                        FROM contest_option

                        WHERE contest_id = :contestId
                    )

                    UPDATE contest_option co

                    SET option_order = ranked.rn

                    FROM ranked

                    WHERE co.option_id = ranked.option_id
                    """,
            nativeQuery = true
    )
    int resequenceOptionOrder(
            @Param("contestId") UUID contestId
    );


    // ========================================================================
    // CANDIDATE OPTIONS IN COLLECTION
    // ========================================================================

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


    // ========================================================================
    // READINESS
    // ========================================================================

    /**
     * Count active options for a contest.
     */
    @Query("""
            select count(co)
            from ContestOption co
            where co.contestId = :contestId
              and co.isActive = true
            """)
    long countActiveByContestId(
            @Param("contestId") UUID contestId
    );


    // ========================================================================
    // SUBMISSION / NORMALIZATION LOOKUPS
    // ========================================================================

    /*
     * JSON keys are option_id.
     */
    List<ContestOption> findByContestIdAndOptionIdIn(
            UUID contestId,
            Collection<UUID> optionIds
    );


    /*
     * JSON keys are elect_id.
     */
    List<ContestOption> findByContestIdAndElectIdIn(
            UUID contestId,
            Collection<UUID> electIds
    );
}