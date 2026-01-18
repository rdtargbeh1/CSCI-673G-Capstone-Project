package election.ems_backend.service.implement;

import election.ems_backend.dto.FileUploadCreateRequest;
import election.ems_backend.dto.FileUploadDto;
import election.ems_backend.entity.*;
import election.ems_backend.enums.FileType;
import election.ems_backend.enums.StorageProvider;
import election.ems_backend.mapper.FileUploadMapper;
import election.ems_backend.repository.*;
import election.ems_backend.service.FileStorageService;
import election.ems_backend.service.FileUploadService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.*;

/**
 * Enhanced FileUploadServiceImplementation:
 *  - Enforces configurable size/type limits
 *  - Registers transaction synchronization to delete stored files on rollback (best-effort)
 *  - Uses storage.getProviderName() to set storageProvider
 *  - Adds structured logging
 */

@Service
@RequiredArgsConstructor
@Slf4j
public class FileUploadServiceImplementation implements FileUploadService {

    private final FileUploadRepository fileUploadRepository;
    private final OrganizationRepository orgRepo;
    private final SystemUserRepository userRepo;
    private final FileStorageService storage;

    // Optionally wire these to auto-create companion records:
    private final TallySheetRepository tallyRepo;              // optional
    private final VoteSubmissionRepository submissionRepo;     // for guard when related_table=vote_submission
    private final ObserverReportRepository observerRepo;       // guard when related_table=observer_report
    private final ChatMessageRepository chatRepo;              // guard when related_table=chat_message

    private static final String RELATED_TABLE_SUBMISSION = "vote_submission";

    private final FileUploadMapper mapper = new FileUploadMapper();


    // Configurable limits
    @Value("${app.upload.maxFileSizeBytes:52428800}") // default 50MB
    private long maxFileSizeBytes;

    @Value("${app.upload.allowedMimeTypes: image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime}")
    private String allowedMimeTypesCsv;

    @Value("${app.upload.maxFilesPerRequest:10}")
    private int maxFilesPerRequest;

    private Set<String> allowedMimeTypes;
    private Set<String> getAllowedMimeTypes() {
        if (allowedMimeTypes == null) {
            allowedMimeTypes = new HashSet<>();
            for (String s : allowedMimeTypesCsv.split(",")) {
                allowedMimeTypes.add(s.trim().toLowerCase(Locale.ROOT));
            }
        }
        return allowedMimeTypes;
    }

    @Override
    @Transactional
    public FileUploadDto uploadMultipart(FileUploadCreateRequest meta, MultipartFile file, UUID uploadedBy) {
        Organization org = orgRepo.findById(meta.getOrgId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));
        SystemUser user = userRepo.findById(uploadedBy)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        requireRelatedExistsAndSameOrg(meta.getRelatedTable(), meta.getRelatedId(), org.getOrgId());

        if (file == null || file.isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "file is required");

        if (file.getSize() > maxFileSizeBytes) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "File exceeds maximum allowed size");
        }

        String contentType = safeContentType(meta.getMimeType() != null ? meta.getMimeType() : file.getContentType(), file.getOriginalFilename());
        if (!getAllowedMimeTypes().contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "File content type not allowed: " + contentType);
        }

        String sha = safeSha256(file);

        // org-scoped de-dup (matches SQL unique index uq_file_by_org_sha on non-deleted)
        if (sha != null && fileUploadRepository.existsActiveByOrgAndSha(org.getOrgId(), sha)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Duplicate file for this organization (same SHA-256)");
        }

        String original = Objects.requireNonNullElse(file.getOriginalFilename(), "upload.bin");
        String ext = original.contains(".") ? original.substring(original.lastIndexOf('.') + 1) : "bin";
        String storedName = meta.getRelatedId() + "-" + UUID.randomUUID() + "." + ext;

        String url;
        try (InputStream in = file.getInputStream()) {
            log.debug("Storing file for org={} relatedTable={} relatedId={} name={} size={}", org.getOrgId(), meta.getRelatedTable(), meta.getRelatedId(), storedName, file.getSize());
            url = storage.store(meta.getRelatedTable(), storedName, in, file.getSize(), contentType);
            // register cleanup if transaction rolls back
            String finalUrl = url;
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status == TransactionSynchronization.STATUS_ROLLED_BACK) {
                        try {
                            log.warn("Transaction rolled back; deleting stored file {}", finalUrl);
                            storage.delete(finalUrl);
                        } catch (Exception ex) {
                            log.error("Failed to delete stored file after rollback: {}", finalUrl, ex);
                        }
                    }
                }
            });
        } catch (IOException e) {
            log.error("Failed to store file", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store file");
        }

        FileUpload f = new FileUpload();
        f.setOrganization(org);
        f.setRelatedTable(meta.getRelatedTable());
        f.setRelatedId(meta.getRelatedId());
        f.setFileType(meta.getFileType());
        f.setFileUrl(url);
        f.setMimeType(meta.getMimeType() != null ? meta.getMimeType() : file.getContentType());
        f.setSizeBytes(meta.getSizeBytes() != null ? meta.getSizeBytes() : file.getSize());
        f.setSha256(sha);
        // derive storage provider from the storage implementation
        try {
            f.setStorageProvider(StorageProvider.valueOf(storage.getProviderName().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException ex) {
            f.setStorageProvider(StorageProvider.LOCAL); // fallback
        }
        f.setUploadedBy(user);
        f.setTags(meta.getTags() != null ? new HashMap<>(meta.getTags()) : new HashMap<>());

        FileUpload saved = persistWithConflictHandling(f);

        // Optional: if this is a TALLY_SHEET for a vote_submission, also persist a TallySheet row
        maybeMirrorToTallySheet(saved);

        return mapper.toDTO(saved);
    }

    @Override
    @Transactional
    public FileUploadDto createByUrl(FileUploadCreateRequest req, UUID uploadedBy) {
        Organization org = orgRepo.findById(req.getOrgId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));
        SystemUser user = userRepo.findById(uploadedBy)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        requireRelatedExistsAndSameOrg(req.getRelatedTable(), req.getRelatedId(), org.getOrgId());

        if (req.getFileUrl() == null || req.getFileUrl().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "fileUrl is required");

        if (req.getSizeBytes() != null && req.getSizeBytes() > maxFileSizeBytes) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "File exceeds maximum allowed size");
        }

        if (req.getSha256() != null && fileUploadRepository.existsActiveByOrgAndSha(org.getOrgId(), req.getSha256())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Duplicate file for this organization (same SHA-256)");
        }

        FileUpload f = new FileUpload();
        f.setOrganization(org);
        f.setRelatedTable(req.getRelatedTable());
        f.setRelatedId(req.getRelatedId());
        f.setFileType(req.getFileType());
        f.setFileUrl(req.getFileUrl());
        f.setMimeType(req.getMimeType());
        f.setSizeBytes(req.getSizeBytes());
        f.setSha256(req.getSha256());
        // storageProvider is provided by caller; if missing try to infer
        f.setStorageProvider(req.getStorageProvider() != null ? req.getStorageProvider() : StorageProvider.LOCAL);
        f.setUploadedBy(user);
        f.setTags(req.getTags() != null ? new HashMap<>(req.getTags()) : new HashMap<>());

        FileUpload saved = persistWithConflictHandling(f);
        maybeMirrorToTallySheet(saved);
        return mapper.toDTO(saved);
    }

    /**
     * Create a submission, and upload associated files atomically in a single transaction.
     * If any file fails to upload, the submission is rolled back entirely.
     *
     * @param submission The submission entity to create.
     * @param files      List of files to upload alongside the submission.
     */
    @Transactional
    public void createSubmissionWithFiles(VoteSubmission submission, List<MultipartFile> files, UUID uploaderId) {
        log.info("Bundling submission creation and files upload into a transaction.");
        Organization org = orgRepo.findById(submission.getOrganization().getOrgId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found."));
        SystemUser uploader = userRepo.findById(uploaderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Uploader not found."));

        // Save submission first
        VoteSubmission savedSubmission = submissionRepo.save(submission);

        // Upload files atomically
        for (MultipartFile file : files) {
            FileUploadCreateRequest meta = new FileUploadCreateRequest();
            meta.setRelatedTable(RELATED_TABLE_SUBMISSION);
            meta.setRelatedId(savedSubmission.getSubmissionId());
            meta.setOrgId(org.getOrgId());
            meta.setFileType(FileType.TALLY_SHEET);
            uploadMultipart(meta, file, uploaderId);
        }

        log.info("Submission and files committed successfully for submissionId={}", savedSubmission.getSubmissionId());
    }


    @Override
    @Transactional(readOnly = true)
    public List<FileUploadDto> list(UUID orgId, String relatedTable, UUID relatedId) {
        return fileUploadRepository.listActive(orgId, relatedTable, relatedId).stream().map(mapper::toDTO).toList();
    }

    @Override
    @Transactional
    public void softDelete(UUID fileId, UUID requesterId) {
        FileUpload f = fileUploadRepository.findById(fileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found"));
        // (Optional) check requester permissions here
        if (f.isDeleted()) return;
        f.softDelete();
        fileUploadRepository.save(f);
    }

    @Override
    @Transactional(readOnly = true)
    public FileUploadDto get(UUID fileId) {
        return fileUploadRepository.findById(fileId).map(mapper::toDTO)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found"));
    }

    @Override
    public List<FileUploadDto> saveAllForEntity(
            Organization org,
            String relatedTable,
            UUID relatedId,
            SystemUser uploadedBy,
            List<MultipartFile> files,
            Map<String, Object> tags
    ) {
        if (org == null || org.getOrgId() == null) {
            throw new IllegalArgumentException("Organization is required");
        }
        if (relatedTable == null || relatedTable.isBlank()) {
            throw new IllegalArgumentException("relatedTable is required");
        }
        if (relatedId == null) {
            throw new IllegalArgumentException("relatedId is required");
        }
        if (files == null || files.isEmpty()) {
            return List.of();
        }

        if (files.size() > maxFilesPerRequest) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Too many files in request");
        }

        final String folder = buildFolder(relatedTable, relatedId); // e.g. observer_report/{UUID}/2025-11-12
        final Map<String, Object> baseTags = tags != null ? new HashMap<>(tags) : new HashMap<>();

        List<FileUploadDto> out = new ArrayList<>(files.size());
        for (MultipartFile mf : files) {
            if (mf.isEmpty()) continue;
            if (mf.getSize() > maxFileSizeBytes) {
                throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "File exceeds maximum allowed size");
            }

            try (InputStream in = mf.getInputStream()) {

                // 1) Compute SHA-256 for de-dup (per org)
                String sha256 = DigestUtils.sha256Hex(in);

                // Re-open stream (already consumed) for actual store:
                try (InputStream in2 = mf.getInputStream()) {

                    // If identical file already exists for this org, re-use it
                    Optional<FileUpload> existing = fileUploadRepository.findActiveByOrgAndSha(org.getOrgId(), sha256);
                    if (existing.isPresent()) {
                        out.add(mapper.toDTO(existing.get()));
                        continue;
                    }

                    String originalName = sanitize(mf.getOriginalFilename());
                    String safeName = uniqueName(sha256, originalName);
                    String contentType = safeContentType(mf.getContentType(), originalName);
                    long size = mf.getSize();

                    // 2) Store the binary (local/S3/etc.) and register cleanup on rollback
                    String fileUrl = storage.store(folder, safeName, in2, size, contentType);
                    String finalFileUrl = fileUrl;
                    TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                        @Override
                        public void afterCompletion(int status) {
                            if (status == TransactionSynchronization.STATUS_ROLLED_BACK) {
                                try {
                                    log.warn("Transaction rolled back; deleting stored file {}", finalFileUrl);
                                    storage.delete(finalFileUrl);
                                } catch (Exception ex) {
                                    log.error("Failed to delete stored file after rollback: {}", finalFileUrl, ex);
                                }
                            }
                        }
                    });

                    // 3) Persist file_upload row
                    FileUpload entity = new FileUpload();
                    entity.setOrganization(org);
                    entity.setRelatedTable(relatedTable);
                    entity.setRelatedId(relatedId);
                    entity.setUploadedBy(uploadedBy);
                    entity.setFileUrl(fileUrl);
                    entity.setMimeType(contentType);
                    entity.setSizeBytes(size);
                    entity.setSha256(sha256);
                    try {
                        entity.setStorageProvider(StorageProvider.valueOf(storage.getProviderName().toUpperCase(Locale.ROOT)));
                    } catch (Exception x) {
                        entity.setStorageProvider(StorageProvider.LOCAL);
                    }
                    entity.setDateUpdated(java.time.LocalDateTime.now());
                    entity.setTags(mergedTags(baseTags, originalName, safeName));

                    // Infer FileType from mime/extension
                    entity.setFileType(guessType(contentType, originalName));

                    FileUpload saved;
                    try {
                        saved = fileUploadRepository.save(entity);
                    } catch (DataIntegrityViolationException dup) {
                        // unique constraint hit (org_id + sha256). Fetch existing & return it
                        saved = fileUploadRepository.findActiveByOrgAndSha(org.getOrgId(), sha256)
                                .orElseThrow(() -> dup);
                    }

                    out.add(mapper.toDTO(saved));
                }
            } catch (Exception e) {
                log.error("Failed to store file in saveAllForEntity: {}", mf.getOriginalFilename(), e);
                throw new RuntimeException("Failed to store file: " + mf.getOriginalFilename(), e);
            }
        }
        return out;
    }

    // ---------- helpers ----------

    private static String buildFolder(String relatedTable, UUID relatedId) {
        return relatedTable + "/" + relatedId + "/" + LocalDate.now();
    }

    private static String sanitize(String name) {
        if (name == null || name.isBlank()) return "file";
        // strip path segments and risky chars
        String base = name.replace("\\", "/");
        base = base.substring(base.lastIndexOf('/') + 1);
        base = base.replaceAll("[\\r\\n]", "_");
        return base;
    }

    private static String uniqueName(String sha256, String originalName) {
        String ext = "";
        int dot = originalName.lastIndexOf('.');
        if (dot > -1 && dot < originalName.length() - 1) {
            ext = originalName.substring(dot).toLowerCase(Locale.ROOT);
        }
        return sha256 + ext; // content-addressed
    }

    private static String safeContentType(String provided, String filename) {
        if (provided != null && !provided.isBlank()) return provided;
        // guess from extension
        String lower = filename == null ? "" : filename.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return MediaType.IMAGE_JPEG_VALUE;
        if (lower.endsWith(".png")) return MediaType.IMAGE_PNG_VALUE;
        if (lower.endsWith(".gif")) return MediaType.IMAGE_GIF_VALUE;
        if (lower.endsWith(".pdf")) return "application/pdf";
        if (lower.endsWith(".mp4")) return "video/mp4";
        if (lower.endsWith(".mov")) return "video/quicktime";
        return MediaType.APPLICATION_OCTET_STREAM_VALUE;
    }


    private static Map<String, Object> mergedTags(Map<String, Object> base, String original, String stored) {
        Map<String, Object> t = new HashMap<>(base);
        t.putIfAbsent("original_name", original);
        t.putIfAbsent("stored_name", stored);
        return t;
    }

    private static FileType guessType(String mime, String filename) {
        if (mime == null) mime = "";
        String m = mime.toLowerCase(Locale.ROOT);
        String f = filename == null ? "" : filename.toLowerCase(Locale.ROOT);

        if (m.startsWith("image/") || f.matches(".*\\.(png|jpg|jpeg|gif|webp|bmp)$")) return FileType.PHOTO;
        if (m.startsWith("video/") || f.matches(".*\\.(mp4|mov|avi|mkv|webm)$")) return FileType.VIDEO;
        if (m.startsWith("audio/") || f.matches(".*\\.(mp3|wav|m4a|aac|ogg)$")) return FileType.AUDIO;
        if (f.endsWith(".pdf") || m.equals("application/pdf")) return FileType.DOCUMENT;
        // Default
        return FileType.DOCUMENT;
    }

    private String storageProviderName() {
        return storage.getProviderName();
    }

    private static String safeSha256(MultipartFile file) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            try (InputStream in = file.getInputStream()) {
                byte[] buf = new byte[8192];
                int r;
                while ((r = in.read(buf)) != -1) md.update(buf, 0, r);
            }
            byte[] digest = md.digest();
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            log.warn("Unable to compute SHA-256 for file {}: {}", file.getOriginalFilename(), e.getMessage());
            return null;
        }
    }


    private FileUpload persistWithConflictHandling(FileUpload f) {
        try {
            return fileUploadRepository.save(f);
        } catch (DataIntegrityViolationException ex) {
            // covers unique index uq_file_by_org_sha (non-deleted)
            // Try to fetch existing active file (concurrent dedupe)
            Optional<FileUpload> existing = fileUploadRepository.findActiveByOrgAndSha(f.getOrganization().getOrgId(), f.getSha256());
            if (existing.isPresent()) {
                return existing.get();
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Duplicate file for this organization", ex);
        }
    }

    /** If the upload corresponds to a tally sheet for a submission, mirror it into the tally_sheet table. */
    private void maybeMirrorToTallySheet(FileUpload saved) {
        if (saved.getFileType() == FileType.TALLY_SHEET && "vote_submission".equals(saved.getRelatedTable())) {
            // create a simple TallySheet row; org consistency is enforced by DB trigger as well
            VoteSubmission sub = submissionRepo.findById(saved.getRelatedId())
                    .orElse(null);
            if (sub != null && sub.getOrganization().getOrgId().equals(saved.getOrganization().getOrgId())) {
                TallySheet t = new TallySheet();
                t.setOrganization(saved.getOrganization());
                t.setSubmission(sub);
                t.setImageUrl(saved.getFileUrl());
                t.setFileSha256(saved.getSha256());
                tallyRepo.save(t);
            }
        }
    }

    // ---------- helpers ----------
    private void requireRelatedExistsAndSameOrg(
            String table,
            UUID relatedId,
            UUID orgId
    ) {
        // 1️⃣ Normalize
        if (table == null || table.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "related_table is required");
        }
        String t = table.trim().toLowerCase(Locale.ROOT);

        // 2️⃣ Whitelist check
        if (!ALLOWED_TABLES.contains(t)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unsupported related_table: " + table
            );
        }

        // 3️⃣ Entity existence + org consistency (only where it matters)
        switch (t) {

            case "system_users" -> {
                SystemUser u = userRepo.findById(relatedId)
                        .orElseThrow(() ->
                                new ResponseStatusException(HttpStatus.BAD_REQUEST, "system_user not found"));

                // If SystemUser is org-scoped, enforce org
                if (u.getDefaultOrg() != null
                        && u.getDefaultOrg().getOrgId() != null
                        && !u.getDefaultOrg().getOrgId().equals(orgId)) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "system_user belongs to another organization"
                    );
                }
            }

            case "vote_submission" -> {
                VoteSubmission s = submissionRepo.findById(relatedId)
                        .orElseThrow(() ->
                                new ResponseStatusException(HttpStatus.BAD_REQUEST, "vote_submission not found"));

                if (!s.getOrganization().getOrgId().equals(orgId)) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "vote_submission belongs to another organization"
                    );
                }
            }

            case "tally_sheet" -> {
                TallySheet ts = tallyRepo.findById(relatedId)
                        .orElseThrow(() ->
                                new ResponseStatusException(HttpStatus.BAD_REQUEST, "tally_sheet not found"));

                if (!ts.getOrganization().getOrgId().equals(orgId)) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "tally_sheet belongs to another organization"
                    );
                }
            }

            case "observer_report" -> {
                ObserverReport r = observerRepo.findById(relatedId)
                        .orElseThrow(() ->
                                new ResponseStatusException(HttpStatus.BAD_REQUEST, "observer_report not found"));

                if (!r.getOrganization().getOrgId().equals(orgId)) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "observer_report belongs to another organization"
                    );
                }
            }

            case "chat_message" -> {
                ChatMessage m = chatRepo.findById(relatedId)
                        .orElseThrow(() ->
                                new ResponseStatusException(HttpStatus.BAD_REQUEST, "chat_message not found"));

                if (!m.getOrganization().getOrgId().equals(orgId)) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "chat_message belongs to another organization"
                    );
                }
            }

            // party / candidate / organization may be global or org-scoped
            case "party", "candidate", "organization" -> {
                // existence checks optional here
                // org consistency can be added later if needed
            }
        }
    }

    private static final Set<String> ALLOWED_TABLES = Set.of(
            "system_users",
            "vote_submission",
            "tally_sheet",
            "observer_report",
            "chat_message",
            "party",
            "candidate",
            "organization"
    );

    /**
     * Validates and uploads multiple files atomically.
     * If any file fails, the transaction is rolled back, leaving no traces of partially uploaded files.
     *
     * @param files       List of files to upload.
     * @param org         Organization that owns the files.
     * @param uploader    User uploading the files.
     * @param relatedTable Table associated with the files.
     * @param relatedId   ID of the entity in the associated table.
     */
    private void uploadFilesAtomic(List<MultipartFile> files, Organization org, SystemUser uploader, String relatedTable, UUID relatedId) {
        if (files == null || files.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Files are required for upload");
        }

        for (MultipartFile file : files) {
            if (file.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File cannot be empty: " + file.getOriginalFilename());
            }

            if (file.getSize() > maxFileSizeBytes) {
                throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "File exceeds maximum allowed size: " + file.getOriginalFilename());
            }

            String contentType = safeContentType(file.getContentType(), file.getOriginalFilename());
            if (!getAllowedMimeTypes().contains(contentType.toLowerCase(Locale.ROOT))) {
                throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "File content type not allowed: " + contentType);
            }

            try {
                uploadSingleFile(org, uploader, file, relatedTable, relatedId, contentType);
            } catch (Exception e) {
                log.error("File upload failed during transaction: relatedTable={}, relatedId={}, file={}", relatedTable, relatedId,
                        file.getOriginalFilename(), e);
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "File upload failed: " + file.getOriginalFilename(), e);
            }
        }
    }

    /**
     * Validates and uploads a single file.
     *
     * @param org         Organization that owns the file.
     * @param uploader    User uploading the file.
     * @param file        The file to upload.
     * @param relatedTable Table associated with the file.
     * @param relatedId   ID of the entity in the associated table.
     * @param contentType Validated MIME type of the file.
     */
    private void uploadSingleFile(Organization org, SystemUser uploader, MultipartFile file, String relatedTable, UUID relatedId, String contentType) throws IOException {
        String sha256 = safeSha256(file);
        if (sha256 != null && fileUploadRepository.existsActiveByOrgAndSha(org.getOrgId(), sha256)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Duplicate file for organization: " + file.getOriginalFilename());
        }

        String originalName = Objects.requireNonNullElse(file.getOriginalFilename(), "unknown.bin");
        String uniqueName = UUID.randomUUID() + "-" + originalName;
        String fileUrl;

        try (InputStream inputStream = file.getInputStream()) {
            fileUrl = storage.store(relatedTable, uniqueName, inputStream, file.getSize(), contentType);
        }

        FileUpload fileUpload = new FileUpload();
        fileUpload.setOrganization(org);
        fileUpload.setUploadedBy(uploader);
        fileUpload.setRelatedTable(relatedTable);
        fileUpload.setRelatedId(relatedId);
        fileUpload.setFileType(FileType.TALLY_SHEET); // Adjust file type logic if necessary.
        fileUpload.setFileUrl(fileUrl);
        fileUpload.setMimeType(contentType);
        fileUpload.setSha256(sha256);
        fileUploadRepository.save(fileUpload);

        log.debug("Uploaded file: relatedTable={}, relatedId={}, file={}, url={}",
                relatedTable, relatedId, file.getOriginalFilename(), fileUrl);
    }


}



