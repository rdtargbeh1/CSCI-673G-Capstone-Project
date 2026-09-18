package election.ems_backend.repository;

import election.ems_backend.entity.ElectionParty;
import election.ems_backend.utility.ElectionPartyId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ElectionPartyRepository extends JpaRepository<ElectionParty, ElectionPartyId> {

    boolean existsByElection_ElectionIdAndParty_PartyId(UUID electionId, UUID partyId);

    List<ElectionParty> findByElection_ElectionIdOrderByBallotOrderAscParty_PartyNameAsc(UUID electionId);

    @Query("select coalesce(max(ep.ballotOrder), 0) from ElectionParty ep where ep.election.electionId = :electionId")
    int findMaxBallotOrder(@Param("electionId") UUID electionId);

    /**
     * Readiness: Count qualified parties for an election.
     * ✅ Used by Overview -> "Election parties qualified"
     *
     * @param electionId election scope
     * @return number of parties with isQualified = true
     */
    @Query(""" 
            select count(ep) 
            from ElectionParty ep 
            where ep.election.electionId = :electionId 
            and ep.isQualified = true """)
    long countQualifiedByElectionId(@Param("electionId") UUID electionId);


    /**
     * Readiness: Count unqualified parties for an election.
     * ⚠️ Used to show warning if any party is not qualified.
     *
     * @param electionId election scope
     * @return number of parties with isQualified = false
     */
    @Query("""
            select count(ep) 
            from ElectionParty ep 
            where ep.election.electionId = :electionId 
            and ep.isQualified = false """)
    long countUnqualifiedByElectionId(@Param("electionId") UUID electionId);


    List<ElectionParty> findByElection_ElectionIdOrderByBallotOrderAsc(UUID electionId);



}
