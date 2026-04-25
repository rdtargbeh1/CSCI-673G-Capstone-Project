package election.ems_backend.controller;

import election.ems_backend.dto.FileUploadCreateRequest;
import election.ems_backend.dto.FileUploadDto;
import election.ems_backend.entity.Organization;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.enums.FileType;
import election.ems_backend.enums.StorageProvider;
import election.ems_backend.repository.OrganizationRepository;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.service.FileUploadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/file-uploads")
@RequiredArgsConstructor
public class FileUploadController {

    private final FileUploadService service;
    private final OrganizationRepository orgRepo;
    private final SystemUserRepository userRepo;

    /** Multipart upload */
    @PostMapping(value = "/{relatedTable}/{relatedId}/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public FileUploadDto upload(
            @PathVariable String relatedTable,
            @PathVariable UUID relatedId,
            @RequestParam UUID orgId,
            @RequestParam UUID uploadedBy,
            @RequestParam FileType fileType,
            @RequestParam StorageProvider storageProvider,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) String mimeType,
            @RequestParam(required = false) Long sizeBytes
    ) {
        FileUploadCreateRequest meta = new FileUploadCreateRequest();
        meta.setOrgId(orgId);
        meta.setRelatedTable(relatedTable);
        meta.setRelatedId(relatedId);
        meta.setFileType(fileType);
        meta.setStorageProvider(storageProvider);
        meta.setMimeType(mimeType);
        meta.setSizeBytes(sizeBytes);
        return service.uploadMultipart(meta, file, uploadedBy);
    }

    /** Create by URL (no file body) */
    @PostMapping("/by-url")
    public FileUploadDto createByUrl(@Valid @RequestBody FileUploadCreateRequest req,
                                     @RequestParam UUID uploadedBy) {
        return service.createByUrl(req, uploadedBy);
    }

    /** List files attached to a record */
    @GetMapping
    public List<FileUploadDto> list(@RequestParam UUID orgId,
                                    @RequestParam String relatedTable,
                                    @RequestParam UUID relatedId) {
        return service.list(orgId, relatedTable, relatedId);
    }

    @GetMapping("/{fileId}")
    public FileUploadDto get(@PathVariable UUID fileId) { return service.get(fileId); }

    /** Soft delete */
    @DeleteMapping("/{fileId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID fileId, @RequestParam UUID requesterId) {
        service.softDelete(fileId, requesterId);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public List<FileUploadDto> upload(
            @RequestParam UUID orgId,
            @RequestParam String relatedTable,
            @RequestParam UUID relatedId,
            @RequestParam UUID uploadedBy,
            @RequestParam(defaultValue = "PHOTO") FileType fileType,                // ✅ added
            @RequestParam(defaultValue = "S3") StorageProvider storageProvider,     // ✅ added
            @RequestPart("files") List<MultipartFile> files
    ) {
        Organization org = orgRepo.findById(orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));
        SystemUser user = userRepo.findById(uploadedBy)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        // ✅ Send metadata down (your service already accepts Map.of())
        return service.saveAllForEntity(
                org,
                relatedTable,
                relatedId,
                user,
                files,
                Map.of(
                        "fileType", fileType.name(),
                        "storageProvider", storageProvider.name()
                )
        );
    }



}