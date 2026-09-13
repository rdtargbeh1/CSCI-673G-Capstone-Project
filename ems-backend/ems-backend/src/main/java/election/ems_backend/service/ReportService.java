package election.ems_backend.service;

import election.ems_backend.dto.ReportRequest;
import election.ems_backend.dto.ReportSnapshotDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ReportService {
    UUID createReport(ReportRequest req, String requestedBy);
    ReportSnapshotDto getSnapshot(UUID snapshotId);
    Page<ReportSnapshotDto> listSnapshots(Pageable pageable);
    byte[] downloadReport(UUID snapshotId) throws Exception;
}
