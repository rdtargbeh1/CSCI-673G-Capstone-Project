package election.ems_backend.repository;

import election.ems_backend.entity.ElectionCandidate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ElectionCandidateRepository extends JpaRepository<ElectionCandidate, UUID> {

    boolean existsByElection_ElectionIdAndCandidate_CandidateId(UUID electionId, UUID candidateId);

    List<ElectionCandidate> findByElection_ElectionId(UUID electionId);

    // Derived query to check uniqueness for election + candidate + center (centerId may be null)
    boolean existsByElection_ElectionIdAndCandidate_CandidateIdAndPollingCenter_CenterId(
            UUID electionId,
            UUID candidateId,
            UUID centerId
    );

    // Explicit pageable findAll (optional — JpaRepository already provides this)
    Page<ElectionCandidate> findAll(Pageable pageable);


    // Variant for the "center is null" (national/district-scoped) case
    boolean existsByElection_ElectionIdAndCandidate_CandidateIdAndPollingCenterIsNull(
            UUID electionId,
            UUID candidateId
    );

    /**
     * Readiness: Count candidates assigned to an election.
     * ✅ Used by Overview -> "Candidates assigned"
     *
     * @param electionId election scope
     * @return number of ElectionCandidate rows for the election
     */

    @Query(""" 
            select count(ec)
            from ElectionCandidate ec 
            where ec.election.electionId = :electionId """)
    long countByElectionId(@Param("electionId") UUID electionId);

    // Find all for an election ordered by candidate full name (used by service.listByElection)
    List<ElectionCandidate> findByElection_ElectionIdOrderByCandidate_FullName(UUID electionId);



}
