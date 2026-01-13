package election.ems_backend.repository;

import election.ems_backend.entity.PollingPlaceAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

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




}
