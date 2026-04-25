package election.ems_backend.views.repo;

import election.ems_backend.views.entity.CountyStatsOfficial;
import election.ems_backend.views.entity.CountyStatsOfficialId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface CountyStatsOfficialRepository extends JpaRepository<CountyStatsOfficial, CountyStatsOfficialId>,
        JpaSpecificationExecutor<CountyStatsOfficial> {
}