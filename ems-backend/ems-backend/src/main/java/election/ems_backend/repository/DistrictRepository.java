package election.ems_backend.repository;

import election.ems_backend.entity.District;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.UUID;

public interface DistrictRepository extends JpaRepository<District, UUID>, JpaSpecificationExecutor<District> {

    boolean existsByDistrictNameIgnoreCaseAndCounty_CountyId(String districtName, UUID countyId);

    Page<District> findByCounty_CountyIdAndDistrictNameContainingIgnoreCase(UUID countyId, String q, Pageable pageable);

    Page<District> findByDistrictNameContainingIgnoreCase(String q, Pageable pageable);

    Page<District> findByCounty_CountyId(UUID countyId, Pageable pageable);

    List<District> findByCounty_CountyIdOrderByDistrictNameAsc(UUID countyId);

}
