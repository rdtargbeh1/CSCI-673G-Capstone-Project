package election.ems_backend.repository;

import election.ems_backend.entity.MvRefreshLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MvRefreshLogRepository extends JpaRepository<MvRefreshLog, String> {
    // primary key is mv_name (String)
}
