package election.ems_backend.repository;

import election.ems_backend.entity.ReportSnapshot;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.UUID;

@Repository
public interface ReportSnapshotRepository
        extends JpaRepository<ReportSnapshot, UUID> {

    // ========================================================================
    // ORGANIZATION
    // ========================================================================

    Page<ReportSnapshot> findByOrgId(
            UUID orgId,
            Pageable pageable
    );

    // ========================================================================
    // ORGANIZATION + ELECTION
    // ========================================================================

    Page<ReportSnapshot> findByOrgIdAndElectionId(
            UUID orgId,
            UUID electionId,
            Pageable pageable
    );

    // ========================================================================
    // COUNTY / MULTI-COUNTY
    // ========================================================================

    Page<ReportSnapshot> findByOrgIdAndElectionIdAndCountyIdIn(
            UUID orgId,
            UUID electionId,
            Collection<UUID> countyIds,
            Pageable pageable
    );

    // ========================================================================
    // DISTRICT
    // ========================================================================

    Page<ReportSnapshot> findByOrgIdAndElectionIdAndDistrictIdIn(
            UUID orgId,
            UUID electionId,
            Collection<UUID> districtIds,
            Pageable pageable
    );

    // ========================================================================
    // CENTER
    // ========================================================================

    Page<ReportSnapshot> findByOrgIdAndElectionIdAndCenterIdIn(
            UUID orgId,
            UUID electionId,
            Collection<UUID> centerIds,
            Pageable pageable
    );
}