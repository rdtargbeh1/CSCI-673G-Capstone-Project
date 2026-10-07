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


    List<NecResultHistory> findByResultIdOrderByDateChangedDesc(UUID resultId);

    List<NecResultHistory> findByElectionIdOrderByDateChangedDesc(UUID electionId);

    // ✅ NEW: Contest scoped history (all centers in contest)
    List<NecResultHistory> findByElectionIdAndContestIdOrderByDateChangedDesc(UUID electionId, UUID contestId);

    // ✅ NEW: Full scope history (single center+contest)
    List<NecResultHistory> findByElectionIdAndContestIdAndCenterIdOrderByDateChangedDesc(
            UUID electionId,
            UUID contestId,
            UUID centerId
    );


    /**
     * NEC Workflow: Get latest change timestamp for an election’s official results.
     * Optional "last updated" card in Overview.
     *
     * @param electionId election scope
     * @return max(dateChanged) or null
     */
    @Query("""
        select max(h.dateChanged)
        from NecResultHistory h
        where h.electionId = :electionId
    """)
    Instant findLastChangeAt(@Param("electionId") UUID electionId);

    /**
     * ✅ NEW: Contest-aware "last updated"
     */
    @Query("""
        select max(h.dateChanged)
        from NecResultHistory h
        where h.electionId = :electionId
          and h.contestId  = :contestId
    """)
    Instant findLastChangeAt(@Param("electionId") UUID electionId,
                             @Param("contestId") UUID contestId);


}
