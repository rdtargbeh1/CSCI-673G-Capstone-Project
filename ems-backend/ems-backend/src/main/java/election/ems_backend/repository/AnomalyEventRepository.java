package election.ems_backend.repository;

import election.ems_backend.entity.AnomalyEvent;
import election.ems_backend.enums.AnomalyKind;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AnomalyEventRepository extends JpaRepository<AnomalyEvent, UUID>, JpaSpecificationExecutor<AnomalyEvent> {

    /**
     * Dedup/anti-spam: detect if we already logged the same anomaly kind
     * at the same center recently for an org + election.
     */
    @Query("""
        select (count(a) > 0)
        from AnomalyEvent a
        where a.organization.orgId = :orgId
          and a.election.electionId = :electionId
          and a.pollingCenter.centerId = :centerId
          and a.kind = :kind
          and a.dateCreated >= :since
    """)
    boolean existsRecentOfSameKindAtCenter(@Param("orgId") UUID orgId,
                                           @Param("electionId") UUID electionId,
                                           @Param("centerId") UUID centerId,
                                           @Param("kind") AnomalyKind kind,
                                           @Param("since") LocalDateTime since);

    /**
     * Integrity Summary: Count ALL anomaly events for an election.
     * Used by Overview -> "Anomalies"
     */
    long countByElection_ElectionId(UUID electionId);


    /**
     * Optional breakdown: anomalies grouped by kind (election-scoped).
     * Used later for Integrity drill-down UI.
     *
     * Returns Object[]: [0]=AnomalyKind, [1]=Long count
     */
    @Query("""
        select a.kind, count(a)
        from AnomalyEvent a
        where a.election.electionId = :electionId
        group by a.kind
        order by count(a) desc
    """)
    List<Object[]> countByKind(@Param("electionId") UUID electionId);


}
