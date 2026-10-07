package election.ems_backend.views.repo;

import election.ems_backend.views.entity.CenterCoverageParty;
import election.ems_backend.views.entity.CenterCoveragePartyId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

/**
 * Repository for reading v_center_coverage_party.
 */
@Repository
public interface CenterCoveragePartyRepository
        extends JpaRepository<CenterCoverageParty, CenterCoveragePartyId>,
        JpaSpecificationExecutor<CenterCoverageParty> {
}