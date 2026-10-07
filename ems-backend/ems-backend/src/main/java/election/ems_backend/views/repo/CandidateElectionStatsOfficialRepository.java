package election.ems_backend.views.repo;

import election.ems_backend.views.entity.CandidateElectionStatsOfficial;
import election.ems_backend.views.entity.CandidateElectionStatsOfficialId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

/**
 * Repository for v_candidate_election_stats_official.
 */
@Repository
public interface CandidateElectionStatsOfficialRepository extends JpaRepository<CandidateElectionStatsOfficial, CandidateElectionStatsOfficialId>,
        JpaSpecificationExecutor<CandidateElectionStatsOfficial> {
}