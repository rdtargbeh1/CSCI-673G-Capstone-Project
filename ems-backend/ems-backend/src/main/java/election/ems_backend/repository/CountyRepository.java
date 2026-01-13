package election.ems_backend.repository;

import election.ems_backend.entity.County;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CountyRepository extends JpaRepository<County, UUID> {

    boolean existsByCountyNameIgnoreCase(String countyName);

    Page<County> findByCountyNameContainingIgnoreCase(String q, Pageable pageable);

}