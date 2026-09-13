package election.ems_backend.repository;

import election.ems_backend.entity.NecResultStaging;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NecResultStagingRepository extends JpaRepository<NecResultStaging, UUID> {

    List<NecResultStaging> findByElectionId(UUID electionId);
    List<NecResultStaging> findByElectionIdAndValidatedFalse(UUID electionId);
    List<NecResultStaging> findByElectionIdAndValidatedTrueAndIsPublishedFalse(UUID electionId);

    // NEW methods used by ImportBatchServiceImpl
    List<NecResultStaging> findByBatchId(UUID batchId);
    List<NecResultStaging> findByBatchIdAndValidatedTrue(UUID batchId);
    List<NecResultStaging> findByBatchIdAndValidatedTrueAndProcessedFalse(UUID batchId);
    List<NecResultStaging> findByBatchIdAndProcessedTrue(UUID batchId);

    // Pageable chunked fetch used by async worker
    Page<NecResultStaging> findByBatchIdAndValidatedTrueAndProcessedFalse(UUID batchId, Pageable pageable);

    /**
     * NEC Workflow: Count all staging rows for election.
     * ✅ Used by Overview -> "Official staging imported"
     *
     * @param electionId election scope
     * @return staging row count
     */
    @Query("""
        select count(nrs)
        from NecResultStaging nrs
        where nrs.electionId = :electionId
        """)
    long countByElectionId(@Param("electionId") UUID electionId);

    /**
     * NEC Workflow: Count unvalidated staging rows.
     * Useful to show ⚠️ if staging exists but not validated.
     */
    @Query("""
        select count(nrs)
        from NecResultStaging nrs
        where nrs.electionId = :electionId
          and nrs.validated = false
        """)
    long countUnvalidatedByElectionId(@Param("electionId") UUID electionId);

    /**
     * NEC Workflow: Count validated staging rows.
     */
    @Query("""
        select count(nrs)
        from NecResultStaging nrs
        where nrs.electionId = :electionId
          and nrs.validated = true
        """)
    long countValidatedByElectionId(@Param("electionId") UUID electionId);



}