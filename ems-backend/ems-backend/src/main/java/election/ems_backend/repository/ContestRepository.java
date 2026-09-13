package election.ems_backend.repository;


import election.ems_backend.entity.Contest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ContestRepository extends JpaRepository<Contest, UUID> {

    List<Contest> findByElectionId(UUID electionId);

    List<Contest> findByElectionIdAndIsActiveTrue(UUID electionId);

    /**
     * Readiness: Count active contests for an election.
     * ✅ Used by Overview -> "Contests & options ready"
     */
    @Query("""
        select count(c)
        from Contest c
        where c.electionId = :electionId
          and c.isActive = true
    """)
    long countActiveByElectionId(@Param("electionId") UUID electionId);

    /**
     * Readiness: Count active contests that have ZERO active options.
     * ✅ Used by Overview to mark contests/options as ❌ or ⚠️
     */
    @Query("""
        select count(c)
        from Contest c
        where c.electionId = :electionId
          and c.isActive = true
          and not exists (
              select 1
              from ContestOption co
              where co.contestId = c.contestId
                and co.isActive = true
          )
    """)
    long countActiveContestsMissingOptions(@Param("electionId") UUID electionId);



}