package election.ems_backend.repository;

import election.ems_backend.entity.Election;
import election.ems_backend.service.ElectionStatsProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

// A dummy entity is required by JpaRepository, but we won't use it.
// The table name here is irrelevant since we only call native queries.
@Repository
public interface StatsRepository extends JpaRepository<Election, UUID> {

    @Query(value = """
        SELECT
            org_id          AS orgId,
            election_id     AS electionId,
            registered_voters AS registeredVoters,
            ballots_cast      AS ballotsCast,
            valid_votes       AS validVotes,
            invalid_total     AS invalidTotal,
            turnout_pct       AS turnoutPct,
            invalid_pct       AS invalidPct
        FROM v_election_stats_party
        WHERE org_id = :orgId
          AND election_id = :electionId
        """, nativeQuery = true)
    Optional<ElectionStatsProjection> findOrgElectionStats(UUID orgId, UUID electionId);


}