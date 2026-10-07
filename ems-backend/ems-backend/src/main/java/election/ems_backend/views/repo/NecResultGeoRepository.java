package election.ems_backend.views.repo;

import election.ems_backend.views.entity.NecResultGeo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

/**
 * Repository for v_nec_result_geo (or mv_nec_result_geo).
 *
 * IMPORTANT: must extend JpaSpecificationExecutor so findAll(Specification, Pageable) is available.
 */
@Repository
public interface NecResultGeoRepository extends JpaRepository<NecResultGeo, Long>,
        JpaSpecificationExecutor<NecResultGeo> {
}
