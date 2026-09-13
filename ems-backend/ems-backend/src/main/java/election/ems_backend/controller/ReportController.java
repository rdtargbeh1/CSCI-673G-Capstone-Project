package election.ems_backend.controller;

import election.ems_backend.dto.ReportRequest;
import election.ems_backend.dto.ReportSnapshotDto;
import election.ems_backend.entity.ReportFile;
import election.ems_backend.entity.ReportSnapshot;
import election.ems_backend.repository.ReportFileRepository;
import election.ems_backend.repository.ReportSnapshotRepository;
import election.ems_backend.service.ReportService;
import election.ems_backend.service.ReportStorageService;
import election.ems_backend.utility.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final ReportSnapshotRepository snapshotRepo;
    private final ReportFileRepository fileRepo;
    private final ReportStorageService storage;

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ReportRequest req, @RequestHeader(value = "X-User", required = false) String user) {
        String requestedBy = user == null ? "unknown" : user;
        UUID id = reportService.createReport(req, requestedBy);
        return ResponseEntity.accepted().body(java.util.Map.of("snapshotId", id));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReportSnapshotDto> get(@PathVariable("id") UUID id) {
        ReportSnapshotDto dto = reportService.getSnapshot(id);
        return ResponseEntity.ok(dto);
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(value="page", defaultValue="0") int page,
                                  @RequestParam(value="size", defaultValue="20") int size) {
        var p = reportService.listSnapshots(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "requestedAt")));
        return ResponseEntity.ok(p);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<?> download(@PathVariable("id") UUID id) throws Exception {
        ReportSnapshot s = snapshotRepo.findById(id).orElseThrow();
        UUID orgId = SecurityUtils.getOrgIdFromContext();
        if (!s.getOrgId().equals(orgId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).build();

        ReportFile f = fileRepo.findAll(org.springframework.data.domain.Example.of(new ReportFile() {{
                    setSnapshotId(id);
                }}), PageRequest.of(0,1, Sort.by("generatedAt").descending()))
                .stream().findFirst().orElseThrow();

        if (f.getFileBlob() != null) {
            ByteArrayResource r = new ByteArrayResource(f.getFileBlob());
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"report." + f.getFormat().toLowerCase() + "\"")
                    .body(r);
        }

        // Try presign
        String presigned = null;
        try {
            presigned = storage.presign(f.getStorageUri(), 3600);
        } catch (Exception ignored) {}

        if (presigned != null) {
            return ResponseEntity.status(HttpStatus.FOUND).header(HttpHeaders.LOCATION, presigned).build();
        }

        byte[] bytes = storage.fetch(f.getStorageUri());
        ByteArrayResource r = new ByteArrayResource(bytes);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"report." + f.getFormat().toLowerCase() + "\"")
                .body(r);
    }
}