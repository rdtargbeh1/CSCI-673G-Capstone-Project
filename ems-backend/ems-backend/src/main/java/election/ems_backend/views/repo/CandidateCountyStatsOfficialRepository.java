package election.ems_backend.views.repo;

import election.ems_backend.views.entity.CandidateCountyStatsOfficial;
import election.ems_backend.views.entity.CandidateCountyStatsOfficialId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

/**
 * Repository for v_candidate_county_stats_official.
 */
@Repository
public interface CandidateCountyStatsOfficialRepository extends JpaRepository<CandidateCountyStatsOfficial, CandidateCountyStatsOfficialId>,
        JpaSpecificationExecutor<CandidateCountyStatsOfficial> {
}
