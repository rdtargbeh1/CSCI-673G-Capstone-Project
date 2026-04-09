package election.ems_backend.views.repo;

import election.ems_backend.views.entity.CandidateCountyStatsParty;
import election.ems_backend.views.entity.CandidateCountyStatsPartyId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

/**
 * Repository for v_candidate_county_stats_party.
 */
@Repository
public interface CandidateCountyStatsPartyRepository extends JpaRepository<CandidateCountyStatsParty, CandidateCountyStatsPartyId>,
        JpaSpecificationExecutor<CandidateCountyStatsParty> {
}