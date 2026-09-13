package election.ems_backend.repository;

import election.ems_backend.entity.VoterRegistrationPublic;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface VoterRegistrationPublicRepository extends JpaRepository<VoterRegistrationPublic, UUID> {


    @Query("""
      SELECT v FROM VoterRegistrationPublic v
      WHERE (:electionId IS NULL OR v.electionId = :electionId)
        AND (:countyId IS NULL OR v.countyId = :countyId)
        AND (:districtId IS NULL OR v.districtId = :districtId)
        AND (:centerId IS NULL OR v.assignedCenterId = :centerId)
        AND (:place IS NULL OR v.pollingPlace = :place)
      """)
    Page<VoterRegistrationPublic> search(
            @Param("electionId") UUID electionId,
            @Param("countyId") UUID countyId,
            @Param("districtId") UUID districtId,
            @Param("centerId") UUID centerId,
            @Param("place") String place,
            Pageable pageable
    );


}