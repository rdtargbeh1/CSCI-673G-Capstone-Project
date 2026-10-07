package election.ems_backend.views.repo;

import election.ems_backend.views.entity.DistrictStatsParty;
import election.ems_backend.views.entity.DistrictStatsPartyId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

/**
 * Repository for reading v_district_stats_party.
 */
@Repository
public interface DistrictStatsPartyRepository extends JpaRepository<DistrictStatsParty, DistrictStatsPartyId>,
        JpaSpecificationExecutor<DistrictStatsParty> {

}