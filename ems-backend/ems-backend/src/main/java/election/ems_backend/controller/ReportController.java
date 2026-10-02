package election.ems_backend.controller;

import election.ems_backend.dto.ReportRequest;
import election.ems_backend.dto.ReportSnapshotDto;

import election.ems_backend.entity.ReportFile;

import election.ems_backend.repository.ReportFileRepository;

import election.ems_backend.service.ReportService;
import election.ems_backend.service.ReportStorageService;

import lombok.RequiredArgsConstructor;

import org.springframework.core.io.ByteArrayResource;

import org.springframework.data.domain.Example;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.*;

import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

// ============================================================================
// REPORT CONTROLLER
// ============================================================================

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    private final ReportFileRepository fileRepo;

    private final ReportStorageService storage;

    // ========================================================================
    // CREATE
    // ========================================================================

    @PostMapping
    public ResponseEntity<?> create(
            @RequestBody ReportRequest req,
            Authentication authentication
    ) {

        if (
                authentication == null
                        || !authentication.isAuthenticated()
        ) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required"
            );
        }

        /*
         * requestedBy comes from authenticated security context.
         *
         * Never trust a caller-controlled X-User header for report audit data.
         */
        String requestedBy =
                authentication.getName();

        UUID snapshotId =
                reportService.createReport(
                        req,
                        requestedBy
                );

        return ResponseEntity
                .accepted()
                .body(
                        Map.of(
                                "snapshotId",
                                snapshotId
                        )
                );
    }

    // ========================================================================
    // GET ONE
    // ========================================================================

    @GetMapping("/{id}")
    public ResponseEntity<ReportSnapshotDto> get(
            @PathVariable("id") UUID id
    ) {

        return ResponseEntity.ok(
                reportService.getSnapshot(
                        id
                )
        );
    }

    // ========================================================================
    // LIST
    // ========================================================================

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(
                    value = "electionId",
                    required = false
            )
            UUID electionId,

            @RequestParam(
                    value = "page",
                    defaultValue = "0"
            )
            int page,

            @RequestParam(
                    value = "size",
                    defaultValue = "20"
            )
            int size
    ) {

        int safePage =
                Math.max(
                        page,
                        0
                );

        int safeSize =
                Math.min(
                        Math.max(
                                size,
                                1
                        ),
                        200
                );

        var result =
                reportService.listSnapshots(
                        electionId,

                        PageRequest.of(
                                safePage,
                                safeSize,
                                Sort.by(
                                        Sort.Direction.DESC,
                                        "requestedAt"
                                )
                        )
                );

        return ResponseEntity.ok(
                result
        );
    }

    // ========================================================================
    // DOWNLOAD
    // ========================================================================

    @GetMapping("/{id}/download")
    public ResponseEntity<?> download(
            @PathVariable("id") UUID id
    ) throws Exception {

        /*
         * SECURITY GATE.
         *
         * This performs:
         *
         * organization boundary
         * + election assignment
         * + geographic report scope
         *
         * before any generated artifact is retrieved.
         */
        reportService.getSnapshot(
                id
        );

        ReportFile probe =
                new ReportFile();

        probe.setSnapshotId(
                id
        );

        ReportFile file =
                fileRepo
                        .findAll(
                                Example.of(
                                        probe
                                ),
                                PageRequest.of(
                                        0,
                                        1,
                                        Sort.by(
                                                Sort.Direction.DESC,
                                                "generatedAt"
                                        )
                                )
                        )
                        .stream()
                        .findFirst()
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Generated report file not found"
                                )
                        );

        // --------------------------------------------------------------------
        // DATABASE BLOB
        // --------------------------------------------------------------------

        if (file.getFileBlob() != null) {

            ByteArrayResource resource =
                    new ByteArrayResource(
                            file.getFileBlob()
                    );

            return ResponseEntity
                    .ok()
                    .contentType(
                            MediaType.APPLICATION_OCTET_STREAM
                    )
                    .header(
                            HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"report."
                                    + safeExtension(
                                    file.getFormat()
                            )
                                    + "\""
                    )
                    .body(
                            resource
                    );
        }

        // --------------------------------------------------------------------
        // EXTERNAL STORAGE
        // --------------------------------------------------------------------

        if (
                file.getStorageUri() == null
                        || file.getStorageUri().isBlank()
        ) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Generated report artifact is unavailable"
            );
        }

        // --------------------------------------------------------------------
        // PRESIGNED DOWNLOAD
        // --------------------------------------------------------------------

        try {

            String presigned =
                    storage.presign(
                            file.getStorageUri(),
                            3600
                    );

            if (
                    presigned != null
                            && !presigned.isBlank()
            ) {

                return ResponseEntity
                        .status(
                                HttpStatus.FOUND
                        )
                        .header(
                                HttpHeaders.LOCATION,
                                presigned
                        )
                        .build();
            }

        } catch (Exception ignored) {
            // Fall back to direct storage fetch.
        }

        // --------------------------------------------------------------------
        // DIRECT STORAGE FETCH
        // --------------------------------------------------------------------

        byte[] bytes =
                storage.fetch(
                        file.getStorageUri()
                );

        ByteArrayResource resource =
                new ByteArrayResource(
                        bytes
                );

        return ResponseEntity
                .ok()
                .contentType(
                        MediaType.APPLICATION_OCTET_STREAM
                )
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"report."
                                + safeExtension(
                                file.getFormat()
                        )
                                + "\""
                )
                .body(
                        resource
                );
    }

    // ========================================================================
    // FILE EXTENSION
    // ========================================================================

    private String safeExtension(
            String format
    ) {

        if (format == null) {
            return "bin";
        }

        return switch (
                format
                        .trim()
                        .toUpperCase()
                ) {

            case "CSV" -> "csv";

            case "XLSX" -> "xlsx";

            case "PDF" -> "pdf";

            default -> "bin";
        };
    }
}