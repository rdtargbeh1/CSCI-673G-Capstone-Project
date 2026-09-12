package election.ems_backend.views.repo;

import election.ems_backend.views.entity.ElectionStatsParty;
import election.ems_backend.views.entity.ElectionStatsPartyId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

/**
 * Repository for reading v_election_stats_party.
 */
@Repository
public interface ElectionStatsPartyRepository extends JpaRepository<ElectionStatsParty, ElectionStatsPartyId>,
        JpaSpecificationExecutor<ElectionStatsParty> {
}