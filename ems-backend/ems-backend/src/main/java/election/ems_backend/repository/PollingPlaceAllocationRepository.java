package election.ems_backend.repository;

import election.ems_backend.entity.PollingPlaceAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PollingPlaceAllocationRepository
        extends JpaRepository<PollingPlaceAllocation, UUID>,
        JpaSpecificationExecutor<PollingPlaceAllocation> {

    Optional<PollingPlaceAllocation> findByElection_ElectionIdAndPollingPlace_PlaceId(UUID electionId, UUID placeId);

    boolean existsByElection_ElectionIdAndPollingPlace_PlaceId(UUID electionId, UUID placeId);

    /**
     * Readiness Checklist:
     * Count polling place allocations for an election.
     * Used by Overview -> "Place allocation"
     */
    long countByElection_ElectionId(UUID electionId);


    List<PollingPlaceAllocation>
    findByElection_ElectionIdAndPollingPlace_PlaceIdIn(
            UUID electionId,
            Collection<UUID> placeIds
    );


    // ============================================================
    // ✅ NEW: Center cap rule helpers (SUM by election + center)
    // ============================================================

    @Query("""
        select coalesce(sum(p.registeredVoters), 0)
        from PollingPlaceAllocation p
        where p.election.electionId = :electionId
          and p.pollingPlace.pollingCenter.centerId = :centerId
    """)
    long sumRegisteredVotersByElectionAndCenter(@Param("electionId") UUID electionId,
                                                @Param("centerId") UUID centerId);

    @Query("""
        select coalesce(sum(coalesce(p.ballotsIssued, 0)), 0)
        from PollingPlaceAllocation p
        where p.election.electionId = :electionId
          and p.pollingPlace.pollingCenter.centerId = :centerId
    """)
    long sumBallotsIssuedByElectionAndCenter(@Param("electionId") UUID electionId,
                                             @Param("centerId") UUID centerId);

    // ============================================================
    // ✅ NEW: Same sums excluding one allocation (for updates)
    // ============================================================

    @Query("""
        select coalesce(sum(p.registeredVoters), 0)
        from PollingPlaceAllocation p
        where p.election.electionId = :electionId
          and p.pollingPlace.pollingCenter.centerId = :centerId
          and p.placeAllocationId <> :excludeId
    """)
    long sumRegisteredVotersByElectionAndCenterExcluding(@Param("electionId") UUID electionId,
                                                         @Param("centerId") UUID centerId,
                                                         @Param("excludeId") UUID excludeId);

    @Query("""
        select coalesce(sum(coalesce(p.ballotsIssued, 0)), 0)
        from PollingPlaceAllocation p
        where p.election.electionId = :electionId
          and p.pollingPlace.pollingCenter.centerId = :centerId
          and p.placeAllocationId <> :excludeId
    """)
    long sumBallotsIssuedByElectionAndCenterExcluding(@Param("electionId") UUID electionId,
                                                      @Param("centerId") UUID centerId,
                                                      @Param("excludeId") UUID excludeId);


}
