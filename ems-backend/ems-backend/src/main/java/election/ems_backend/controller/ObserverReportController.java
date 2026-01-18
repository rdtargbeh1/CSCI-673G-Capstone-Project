package election.ems_backend.controller;

import election.ems_backend.dto.ObserverReportCreateRequest;
import election.ems_backend.dto.ObserverReportDto;
import election.ems_backend.dto.ObserverReportUpdateRequest;
import election.ems_backend.service.ObserverReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/observer-reports")
@RequiredArgsConstructor
public class ObserverReportController {

    private final ObserverReportService observerReportService;


    /**
     * Create an observer report with optional evidence files.
     *
     * Expect multipart payload:
     *  - Part "data": JSON for ObserverReportCreateRequest
     *  - Part "files": 0..N files (images/videos/docs)
     */
    @PostMapping(
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<ObserverReportDto> create(
            @Valid @RequestPart("data") ObserverReportCreateRequest req,
            @RequestPart(name = "files", required = false) List<MultipartFile> files
    ) {
        ObserverReportDto dto = observerReportService.create(req, files == null ? List.of() : files);
        return ResponseEntity.ok(dto);
    }

    /**
     * Update an observer report, optionally appending new evidence files.
     *
     * Expect multipart payload:
     *  - Part "data": JSON for ObserverReportUpdateRequest
     *  - Part "files": 0..N files to append
     */
    @PutMapping(
            value = "/{reportId}",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<ObserverReportDto> update(
            @PathVariable UUID reportId,
            @Valid @RequestPart("data") ObserverReportUpdateRequest req,
            @RequestPart(name = "files", required = false) List<MultipartFile> filesToAppend
    ) {
        ObserverReportDto dto = observerReportService.update(
                reportId,
                req,
                filesToAppend == null ? List.of() : filesToAppend
        );
        return ResponseEntity.ok(dto);
    }


    @DeleteMapping("/{id}")
    public void delete(@PathVariable UUID id) {
        observerReportService.delete(id);
    }

    @GetMapping("/{id}")
    public ObserverReportDto get(@PathVariable UUID id) {
        return observerReportService.get(id);
    }

    @GetMapping
    public Page<ObserverReportDto> search(
            @RequestParam(required = false) UUID orgId,
            @RequestParam(required = false) UUID observerId,
            @RequestParam(required = false) UUID countyId,
            @RequestParam(required = false) UUID centerId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Boolean resolved,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20, sort = "timestamp", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return observerReportService.search(orgId, observerId, countyId, centerId, type, resolved, from, to, q, pageable);
    }

    // Optional: proximity endpoint (returns a simple list)
    @GetMapping("/near")
    public java.util.List<ObserverReportDto> near(
            @RequestParam UUID orgId,
            @RequestParam double lat,
            @RequestParam double lon,
            @RequestParam(defaultValue = "2000") double meters
    ) {
        return observerReportService.near(orgId, lat, lon, meters);
    }
}