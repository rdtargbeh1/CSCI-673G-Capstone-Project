package election.ems_backend.views.repository;

import election.ems_backend.views.entity.PlaceCoverageParty;
import election.ems_backend.views.entity.PlaceCoveragePartyId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

/**
 * Repository for reading v_place_coverage_party.
 */
@Repository
public interface PlaceCoveragePartyRepository extends JpaRepository<PlaceCoverageParty, PlaceCoveragePartyId>,
        JpaSpecificationExecutor<PlaceCoverageParty> {
}
