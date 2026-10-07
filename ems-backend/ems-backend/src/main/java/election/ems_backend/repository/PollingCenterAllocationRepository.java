package election.ems_backend.repository;

import election.ems_backend.entity.Election;
import election.ems_backend.entity.PollingCenter;
import election.ems_backend.entity.PollingCenterAllocation;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PollingCenterAllocationRepository  extends JpaRepository<PollingCenterAllocation, UUID>,
        JpaSpecificationExecutor<PollingCenterAllocation> {

    Optional<PollingCenterAllocation> findByElection_ElectionIdAndPollingCenter_CenterId(
            UUID electionId, UUID centerId);

    boolean existsByElection_ElectionIdAndPollingCenter_CenterId(
            UUID electionId, UUID centerId);

    Optional<PollingCenterAllocation> findByElectionAndPollingCenter(
            Election election,
            PollingCenter pollingCenter
    );

    /**
     * Readiness Checklist:
     * Count polling center allocations for an election.
     * Used by Overview -> "Center allocation"
     */
    long countByElection_ElectionId(UUID electionId);


    // ============================================================
    // ✅ NEW: Lock center allocation row while validating caps
    // ============================================================

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select a from PollingCenterAllocation a
        where a.election.electionId = :electionId
          and a.pollingCenter.centerId = :centerId
    """)
    Optional<PollingCenterAllocation> findForUpdate(@Param("electionId") UUID electionId,
                                                    @Param("centerId") UUID centerId);


}