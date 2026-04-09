package election.ems_backend.repository;


import election.ems_backend.entity.Election;
import election.ems_backend.enums.ElectionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ElectionRepository extends JpaRepository<Election, UUID>, JpaSpecificationExecutor<Election> {

    boolean existsByElectionNameIgnoreCaseAndYear(String electionName, int year);

    List<Election> findByIsActiveTrueOrderByDateCreatedDesc();

    /**
     * Readiness guard: Ensure election exists and is active.
     * Optional, but useful to fail fast and avoid showing bogus stats.
     *
     * @param electionId election scope
     * @return true if election exists and is active
     */
    @Query("""
            select case when count(e) > 0 then true else false end 
            from Election e 
            where e.electionId = :electionId 
            and e.isActive = true 
            """)
    boolean existsActiveElection(@Param("electionId") UUID electionId);


    Optional<Election> findFirstByIsActiveTrueAndElectionType(ElectionType type);


}