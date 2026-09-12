package election.ems_backend.repository;

import election.ems_backend.entity.ReportSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ReportSnapshotRepository extends JpaRepository<ReportSnapshot, UUID> {
}