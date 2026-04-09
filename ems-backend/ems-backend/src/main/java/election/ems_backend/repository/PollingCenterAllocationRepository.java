package election.ems_backend.repository;

import election.ems_backend.entity.Election;
import election.ems_backend.entity.PollingCenter;
import election.ems_backend.entity.PollingCenterAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
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



//    Optional<PollingCenterAllocation> findByElection_ElectionIdAndPollingCenter_PollingCenterId(UUID electionId, UUID centerId);

//    boolean existsByElection_ElectionIdAndPollingCenter_PollingCenterId(UUID electionId, UUID centerId);

}