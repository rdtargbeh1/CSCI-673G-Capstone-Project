package election.ems_backend.repository;

import election.ems_backend.entity.VoterRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VoterRegistrationRepository extends JpaRepository<VoterRegistration, UUID> {
    Optional<VoterRegistration> findByLookupHash(String lookupHash);

    // lists for roll extraction / center-level lookups
    List<VoterRegistration> findByAssignedCenterId(UUID centerId);

    List<VoterRegistration> findByDistrictId(UUID districtId);

    List<VoterRegistration> findByCountyId(UUID countyId);

    List<VoterRegistration> findByElectionId(UUID electionId);

    /**
     * Optional readiness: Count final voter registrations for an election.
     */
    long countByElectionId(UUID electionId);


}