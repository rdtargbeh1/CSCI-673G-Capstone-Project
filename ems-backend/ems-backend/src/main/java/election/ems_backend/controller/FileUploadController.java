package election.ems_backend.controller;

import election.ems_backend.dto.FileUploadCreateRequest;
import election.ems_backend.dto.FileUploadDto;
import election.ems_backend.entity.Organization;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.enums.FileType;
import election.ems_backend.repository.OrganizationRepository;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.service.FileStorageService;
import election.ems_backend.service.FileUploadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.URI;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;


/**
 * Unified FileUpload controller.
 *
 * Client code does not select the physical storage provider.
 *
 * app.storage.provider=local
 *
 * or
 *
 * app.storage.provider=s3
 */
@RestController
@RequestMapping("/api/file-uploads")
@RequiredArgsConstructor
public class FileUploadController {

    private final FileUploadService service;

    private final FileStorageService storage;

    private final OrganizationRepository orgRepo;

    private final SystemUserRepository userRepo;


    // =========================================================================
    // SINGLE MULTIPART UPLOAD
    // =========================================================================

    @PostMapping(
            value = "/{relatedTable}/{relatedId}/upload",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public FileUploadDto upload(
            @PathVariable String relatedTable,
            @PathVariable UUID relatedId,
            @RequestParam UUID orgId,
            @RequestParam UUID uploadedBy,
            @RequestParam(defaultValue = "PHOTO") FileType fileType,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) String mimeType,
            @RequestParam(required = false) Long sizeBytes
    ) {

        FileUploadCreateRequest meta =
                new FileUploadCreateRequest();


        meta.setOrgId(
                orgId
        );


        meta.setRelatedTable(
                relatedTable
        );


        meta.setRelatedId(
                relatedId
        );


        meta.setFileType(
                fileType
        );


        meta.setMimeType(
                mimeType
        );


        meta.setSizeBytes(
                sizeBytes
        );


        return service.uploadMultipart(
                meta,
                file,
                uploadedBy
        );
    }


    // =========================================================================
    // CREATE BY URL
    // =========================================================================

    @PostMapping("/by-url")
    public FileUploadDto createByUrl(
            @Valid
            @RequestBody
            FileUploadCreateRequest req,

            @RequestParam
            UUID uploadedBy
    ) {

        return service.createByUrl(
                req,
                uploadedBy
        );
    }


    // =========================================================================
    // LIST FILES FOR ENTITY
    // =========================================================================

    @GetMapping
    public List<FileUploadDto> list(
            @RequestParam UUID orgId,
            @RequestParam String relatedTable,
            @RequestParam UUID relatedId
    ) {

        return service.list(
                orgId,
                relatedTable,
                relatedId
        );
    }


    // =========================================================================
    // GET FILE METADATA
    // =========================================================================

    @GetMapping("/{fileId}")
    public FileUploadDto get(
            @PathVariable UUID fileId
    ) {

        return service.get(
                fileId
        );
    }


    // =========================================================================
    // GET FILE CONTENT
    //
    // LOCAL:
    // streams through the application.
    //
    // S3:
    // redirects to a short-lived presigned GET URL.
    // =========================================================================

    @GetMapping("/{fileId}/content")
    public ResponseEntity<?> content(
            @PathVariable UUID fileId
    ) {

        FileUploadDto file =
                service.get(
                        fileId
                );


        if (
                file.getFileUrl() == null ||
                        file.getFileUrl().isBlank()
        ) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Stored file location is missing"
            );
        }


        // =====================================================================
        // S3
        // =====================================================================

        if (
                "S3".equalsIgnoreCase(
                        storage.getProviderName()
                )
        ) {

            String signedUrl =
                    storage.presignRead(
                            file.getFileUrl(),
                            Duration.ofMinutes(
                                    15
                            )
                    );


            if (
                    signedUrl == null ||
                            signedUrl.isBlank()
            ) {

                throw new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "Unable to create file access URL"
                );
            }


            return ResponseEntity
                    .status(
                            HttpStatus.FOUND
                    )
                    .location(
                            URI.create(
                                    signedUrl
                            )
                    )
                    .build();
        }


        // =====================================================================
        // LOCAL
        // =====================================================================

        try {

            byte[] content =
                    storage.read(
                            file.getFileUrl()
                    );


            MediaType mediaType =
                    resolveMediaType(
                            file.getMimeType()
                    );


            return ResponseEntity
                    .ok()
                    .contentType(
                            mediaType
                    )
                    .header(
                            HttpHeaders.CACHE_CONTROL,
                            "private, max-age=300"
                    )
                    .body(
                            content
                    );

        } catch (
                IOException ex
        ) {

            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Stored file could not be read",
                    ex
            );
        }
    }


    // =========================================================================
    // SOFT DELETE
    // =========================================================================

    @DeleteMapping("/{fileId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable UUID fileId,
            @RequestParam UUID requesterId
    ) {

        service.softDelete(
                fileId,
                requesterId
        );
    }


    // =========================================================================
    // MULTIPLE FILE UPLOAD
    // =========================================================================

    @PostMapping(
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public List<FileUploadDto> upload(
            @RequestParam UUID orgId,
            @RequestParam String relatedTable,
            @RequestParam UUID relatedId,
            @RequestParam UUID uploadedBy,
            @RequestParam(defaultValue = "PHOTO") FileType fileType,
            @RequestPart("files") List<MultipartFile> files
    ) {

        Organization org =
                orgRepo
                        .findById(
                                orgId
                        )
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "Organization not found"
                                        )
                        );


        SystemUser user =
                userRepo
                        .findById(
                                uploadedBy
                        )
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "User not found"
                                        )
                        );


        return service.saveAllForEntity(
                org,
                relatedTable,
                relatedId,
                user,
                files,

                Map.of(
                        "fileType",
                        fileType.name()
                )
        );
    }


    // =========================================================================
    // MEDIA TYPE
    // =========================================================================

    private MediaType resolveMediaType(
            String mimeType
    ) {

        if (
                mimeType == null ||
                        mimeType.isBlank()
        ) {

            return MediaType
                    .APPLICATION_OCTET_STREAM;
        }


        try {

            return MediaType.parseMediaType(
                    mimeType
            );

        } catch (
                Exception ex
        ) {

            return MediaType
                    .APPLICATION_OCTET_STREAM;
        }
    }
}