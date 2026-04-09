package election.ems_backend.repository;

import election.ems_backend.entity.PollingPlace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PollingPlaceRepository
        extends JpaRepository<PollingPlace, UUID>, JpaSpecificationExecutor<PollingPlace> {

    boolean existsByPollingCenter_CenterIdAndPlaceNumber(UUID centerId, Integer placeNumber);

    Optional<PollingPlace> findByCode(String code);

    List<PollingPlace> findByPollingCenter_CenterIdOrderByPlaceNumberAsc(UUID centerId);


}
