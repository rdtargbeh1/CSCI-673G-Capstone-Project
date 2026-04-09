package election.ems_backend.views.repo;

import election.ems_backend.views.entity.CandidateCenterStatsParty;
import election.ems_backend.views.entity.CandidateCenterStatsPartyId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

/**
 * Repository for v_candidate_center_stats_party
 */
@Repository
public interface CandidateCenterStatsPartyRepository extends JpaRepository<CandidateCenterStatsParty, CandidateCenterStatsPartyId>,
        JpaSpecificationExecutor<CandidateCenterStatsParty> {
}