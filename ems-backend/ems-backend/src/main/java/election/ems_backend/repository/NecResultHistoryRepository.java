package election.ems_backend.repository;

import election.ems_backend.entity.NecResultHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface NecResultHistoryRepository extends JpaRepository<NecResultHistory, UUID> {
    List<NecResultHistory> findByResultIdOrderByChangedAtDesc(UUID resultId);
    List<NecResultHistory> findByElectionIdOrderByChangedAtDesc(UUID electionId);


    /**
     * NEC Workflow: Get latest change timestamp for an election’s official results.
     * Optional "last updated" card in Overview.
     *
     * @param electionId election scope
     * @return max(changedAt) or null
     */
    @Query("""
        select max(h.changedAt)
        from NecResultHistory h
        where h.electionId = :electionId
    """)
    Instant findLastChangeAt(@Param("electionId") UUID electionId);

}
