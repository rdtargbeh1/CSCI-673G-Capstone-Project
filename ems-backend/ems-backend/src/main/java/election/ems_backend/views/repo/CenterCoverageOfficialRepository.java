package election.ems_backend.views.repo;


import election.ems_backend.views.entity.CenterCoverageOfficial;
import election.ems_backend.views.entity.CenterCoverageOfficialId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

/**
 * Repository for reading v_center_coverage_official.
 */
@Repository
public interface CenterCoverageOfficialRepository extends JpaRepository<CenterCoverageOfficial, CenterCoverageOfficialId>,
        JpaSpecificationExecutor<CenterCoverageOfficial> {
}
