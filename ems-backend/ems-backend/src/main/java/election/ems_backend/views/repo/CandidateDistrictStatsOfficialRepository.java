package election.ems_backend.views.repo;

import election.ems_backend.views.entity.CandidateDistrictStatsOfficial;
import election.ems_backend.views.entity.CandidateDistrictStatsOfficialId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

/**
 * Repository for v_candidate_district_stats_official.
 */
@Repository
public interface CandidateDistrictStatsOfficialRepository extends JpaRepository<CandidateDistrictStatsOfficial, CandidateDistrictStatsOfficialId>,
        JpaSpecificationExecutor<CandidateDistrictStatsOfficial> {
}