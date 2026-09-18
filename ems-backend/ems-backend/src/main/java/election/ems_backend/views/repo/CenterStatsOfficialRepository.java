package election.ems_backend.views.repo;

import election.ems_backend.views.entity.CenterStatsOfficial;
import election.ems_backend.views.entity.CenterStatsOfficialId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface CenterStatsOfficialRepository extends JpaRepository<CenterStatsOfficial, CenterStatsOfficialId>,
        JpaSpecificationExecutor<CenterStatsOfficial> {
}