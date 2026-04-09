package election.ems_backend.views.repo;

import election.ems_backend.views.entity.DistrictStatsOfficial;
import election.ems_backend.views.entity.DistrictStatsOfficialId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface DistrictStatsOfficialRepository extends JpaRepository<DistrictStatsOfficial, DistrictStatsOfficialId>,
        JpaSpecificationExecutor<DistrictStatsOfficial> {
}