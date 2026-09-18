package election.ems_backend.views.repo;

import election.ems_backend.views.entity.CandidateElectionStatsParty;
import election.ems_backend.views.entity.CandidateElectionStatsPartyId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

/**
 * Repository for v_candidate_election_stats_party.
 */
@Repository
public interface CandidateElectionStatsPartyRepository extends JpaRepository<CandidateElectionStatsParty, CandidateElectionStatsPartyId>,
        JpaSpecificationExecutor<CandidateElectionStatsParty> {
}