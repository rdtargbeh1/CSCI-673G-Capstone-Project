package election.ems_backend.views.repo;

import election.ems_backend.views.entity.CandidateDistrictStatsParty;
import election.ems_backend.views.entity.CandidateDistrictStatsPartyId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

/**
 * Repository for v_candidate_district_stats_party.
 */
@Repository
public interface CandidateDistrictStatsPartyRepository extends JpaRepository<CandidateDistrictStatsParty, CandidateDistrictStatsPartyId>,
        JpaSpecificationExecutor<CandidateDistrictStatsParty> {
}