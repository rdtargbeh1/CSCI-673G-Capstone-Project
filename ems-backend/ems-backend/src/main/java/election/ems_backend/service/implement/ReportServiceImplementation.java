package election.ems_backend.service.implement;

import election.ems_backend.dto.ReportRequest;
import election.ems_backend.dto.ReportSnapshotDto;
import election.ems_backend.entity.ReportFile;
import election.ems_backend.entity.ReportSnapshot;
import election.ems_backend.repository.ReportFileRepository;
import election.ems_backend.repository.ReportSnapshotRepository;
import election.ems_backend.service.ReportGeneratorService;
import election.ems_backend.service.ReportService;
import election.ems_backend.utility.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReportServiceImplementation implements ReportService {

    private final ReportSnapshotRepository snapshotRepo;
    private final ReportFileRepository fileRepo;
    private final ReportGeneratorService generator;

    @Override
    @Transactional
    public UUID createReport(ReportRequest req, String requestedBy) {
        if (req.getElectionId() == null) throw new IllegalArgumentException("electionId is required");

        UUID orgId = SecurityUtils.getOrgIdFromContext();
        if (orgId == null) throw new IllegalArgumentException("caller must be in an org context");

        ReportSnapshot s = new ReportSnapshot();
        s.setSnapshotId(UUID.randomUUID());
        s.setOrgId(orgId);
        s.setElectionId(req.getElectionId());
        s.setCountyId(req.getCountyId());
        s.setDistrictId(req.getDistrictId());
        s.setCenterId(req.getCenterId());
        s.setCandidateId(req.getCandidateId());
        s.setPartyId(req.getPartyId());
        s.setFilters(null);
        s.setRequestedFormat(req.getFormat() == null ? "CSV" : req.getFormat().toUpperCase());
        s.setRequestedBy(requestedBy);
        s.setRequestedAt(OffsetDateTime.now());
        s.setStatus("PENDING");
        snapshotRepo.save(s);

        // Kick off generation (async)
        generator.generate(s.getSnapshotId());
        return s.getSnapshotId();
    }

    @Override
    @Transactional(readOnly = true)
    public ReportSnapshotDto getSnapshot(UUID snapshotId) {
        ReportSnapshot s = snapshotRepo.findById(snapshotId).orElseThrow();
        ReportSnapshotDto d = new ReportSnapshotDto();
        d.setSnapshotId(s.getSnapshotId());
        d.setOrgId(s.getOrgId());
        d.setElectionId(s.getElectionId());
        d.setRequestedFormat(s.getRequestedFormat());
        d.setRequestedAt(s.getRequestedAt());
        d.setRequestedBy(s.getRequestedBy());
        d.setStatus(s.getStatus());
        d.setStatusMessage(s.getStatusMessage());
        fileRepo.findAll(Example.of(new ReportFile() {{
            setSnapshotId(s.getSnapshotId());
        }}), PageRequest.of(0,1)).stream().findFirst().ifPresent(f -> d.setFileId(f.getFileId()));
        return d;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReportSnapshotDto> listSnapshots(Pageable pageable) {
        UUID orgId = SecurityUtils.getOrgIdFromContext();
        if (orgId == null) throw new IllegalArgumentException("caller must be in an org context");
        Page<ReportSnapshot> src = snapshotRepo.findAll(Example.of(new ReportSnapshot() {{
            setOrgId(orgId);
        }}), pageable);
        return src.map(s -> {
            ReportSnapshotDto d = new ReportSnapshotDto();
            d.setSnapshotId(s.getSnapshotId());
            d.setOrgId(s.getOrgId());
            d.setElectionId(s.getElectionId());
            d.setRequestedFormat(s.getRequestedFormat());
            d.setRequestedAt(s.getRequestedAt());
            d.setRequestedBy(s.getRequestedBy());
            d.setStatus(s.getStatus());
            d.setStatusMessage(s.getStatusMessage());
            return d;
        });
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] downloadReport(UUID snapshotId) throws Exception {
        UUID orgId = SecurityUtils.getOrgIdFromContext();
        ReportSnapshot s = snapshotRepo.findById(snapshotId).orElseThrow();
        if (!s.getOrgId().equals(orgId)) throw new IllegalArgumentException("Forbidden");

        ReportFile f = fileRepo.findAll(Example.of(new ReportFile() {{
                    setSnapshotId(snapshotId);
                }}), PageRequest.of(0,1, Sort.by(Sort.Direction.DESC, "generatedAt")))
                .stream().findFirst().orElseThrow();

        if (f.getFileBlob() != null) return f.getFileBlob();

        throw new UnsupportedOperationException("Use the controller download endpoint (may return presigned URL).");
    }
}