package election.ems_backend.repository;

import election.ems_backend.entity.PollingCenter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PollingCenterRepository extends JpaRepository<PollingCenter, UUID>, JpaSpecificationExecutor<PollingCenter> {

    boolean existsByCodeIgnoreCase(String code);

    Optional<PollingCenter> findByCodeIgnoreCase(String code);
}