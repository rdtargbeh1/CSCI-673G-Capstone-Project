package election.ems_backend.views.repo;

import election.ems_backend.views.entity.CountyStatsParty;
import election.ems_backend.views.entity.CountyStatsPartyId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

/**
 * Repository for reading v_county_stats_party.
 */
@Repository
public interface CountyStatsPartyRepository extends JpaRepository<CountyStatsParty, CountyStatsPartyId>,
        JpaSpecificationExecutor<CountyStatsParty> {
}