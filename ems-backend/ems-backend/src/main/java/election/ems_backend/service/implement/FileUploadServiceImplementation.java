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
 * Central FileUpload service.
 *
 * Responsibilities:
 *
 * 1. Validate uploaded files.
 * 2. Store binaries through FileStorageService.
 * 3. Persist FileUpload metadata.
 * 4. Support Local / S3 transparently.
 * 5. Maintain existing tally-sheet integration.
 * 6. Synchronize primary media fields for supported entities.
 *
 * Primary-media synchronization is intentionally limited to fields
 * directly related to FileUpload:
 *
 * party               -> Party.logoUrl
 * candidate           -> Candidate.photoUrl
 * organization        -> Organization.logoUrl
 * system_users        -> SystemUser.profileImageUrl
 *                        SystemUser.profileImageUpload
 * voter_registration  -> VoterRegistration.pictureUrl
 * observer_report     -> ObserverReport.mediaUrl
 *
 * Other application/domain logic is not handled here.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FileUploadServiceImplementation implements FileUploadService {

    // =========================================================================
    // FILE UPLOAD
    // =========================================================================

    private final FileUploadRepository fileUploadRepository;


    // =========================================================================
    // CORE RELATED ENTITIES
    // =========================================================================

    private final OrganizationRepository orgRepo;

    private final SystemUserRepository userRepo;

    private final PartyRepository partyRepository;

    private final CandidateRepository candidateRepository;

    private final VoterRegistrationRepository voterRegistrationRepository;


    // =========================================================================
    // EXISTING FILE-RELATED ENTITIES
    // =========================================================================

    private final TallySheetRepository tallyRepo;

    private final VoteSubmissionRepository submissionRepo;

    private final ObserverReportRepository observerRepo;

    private final ChatMessageRepository chatRepo;


    // =========================================================================
    // STORAGE
    // =========================================================================

    private final FileStorageService storage;


    // =========================================================================
    // CONSTANTS
    // =========================================================================

    private static final String RELATED_TABLE_SUBMISSION =
            "vote_submission";


    private static final String RELATED_TABLE_PARTY =
            "party";


    private static final String RELATED_TABLE_CANDIDATE =
            "candidate";


    private static final String RELATED_TABLE_ORGANIZATION =
            "organization";


    private static final String RELATED_TABLE_SYSTEM_USERS =
            "system_users";


    private static final String RELATED_TABLE_VOTER_REGISTRATION =
            "voter_registration";


    private static final String RELATED_TABLE_OBSERVER_REPORT =
            "observer_report";


    // =========================================================================
    // MAPPER
    // =========================================================================

    private final FileUploadMapper mapper =
            new FileUploadMapper();


    // =========================================================================
    // CONFIGURATION
    // =========================================================================

    @Value("${app.upload.maxFileSizeBytes:52428800}")
    private long maxFileSizeBytes;


    @Value(
            "${app.upload.allowedMimeTypes:"
                    + "image/jpeg,"
                    + "image/png,"
                    + "image/webp,"
                    + "application/pdf,"
                    + "video/mp4,"
                    + "video/quicktime}"
    )
    private String allowedMimeTypesCsv;


    @Value("${app.upload.maxFilesPerRequest:10}")
    private int maxFilesPerRequest;


    private Set<String> allowedMimeTypes;


    // =========================================================================
    // ALLOWED RELATED TABLES
    // =========================================================================

    private static final Set<String> ALLOWED_TABLES =
            Set.of(
                    "system_users",
                    "vote_submission",
                    "tally_sheet",
                    "observer_report",
                    "chat_message",
                    "party",
                    "candidate",
                    "organization",
                    "voter_registration"
            );


    // =========================================================================
    // ALLOWED MIME TYPES
    // =========================================================================

    private Set<String> getAllowedMimeTypes() {

        if (allowedMimeTypes == null) {

            allowedMimeTypes =
                    new HashSet<>();


            for (
                    String value :
                    allowedMimeTypesCsv.split(",")
            ) {

                if (
                        value != null &&
                                !value.isBlank()
                ) {

                    allowedMimeTypes.add(
                            value
                                    .trim()
                                    .toLowerCase(
                                            Locale.ROOT
                                    )
                    );
                }
            }
        }


        return allowedMimeTypes;
    }


    // =========================================================================
    // SINGLE MULTIPART UPLOAD
    // =========================================================================

    @Override
    @Transactional
    public FileUploadDto uploadMultipart(
            FileUploadCreateRequest meta,
            MultipartFile file,
            UUID uploadedBy
    ) {

        if (meta == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Upload metadata is required"
            );
        }


        Organization org =
                orgRepo
                        .findById(
                                meta.getOrgId()
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


        String relatedTable =
                normalizeRelatedTable(
                        meta.getRelatedTable()
                );


        requireRelatedExistsAndSameOrg(
                relatedTable,
                meta.getRelatedId(),
                org.getOrgId()
        );


        if (
                file == null ||
                        file.isEmpty()
        ) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "file is required"
            );
        }


        if (
                file.getSize() >
                        maxFileSizeBytes
        ) {

            throw new ResponseStatusException(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "File exceeds maximum allowed size"
            );
        }


        String contentType =
                safeContentType(
                        meta.getMimeType() != null
                                ? meta.getMimeType()
                                : file.getContentType(),

                        file.getOriginalFilename()
                );


        validateAllowedContentType(
                contentType
        );


        String sha =
                safeSha256(
                        file
                );


        /*
         * Preserve the existing org-level duplicate protection.
         */
        if (
                sha != null &&
                        fileUploadRepository.existsActiveByOrgAndSha(
                                org.getOrgId(),
                                sha
                        )
        ) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Duplicate file for this organization (same SHA-256)"
            );
        }


        String original =
                Objects.requireNonNullElse(
                        file.getOriginalFilename(),
                        "upload.bin"
                );


        String extension =
                getExtension(
                        original
                );


        String storedName =
                meta.getRelatedId()
                        + "-"
                        + UUID.randomUUID()
                        + (
                        extension.isBlank()
                                ? ""
                                : "." + extension
                );


        String fileUrl;


        try (
                InputStream input =
                        file.getInputStream()
        ) {

            log.debug(
                    "Storing file: org={}, relatedTable={}, relatedId={}, name={}, size={}",
                    org.getOrgId(),
                    relatedTable,
                    meta.getRelatedId(),
                    storedName,
                    file.getSize()
            );


            fileUrl =
                    storage.store(
                            relatedTable,
                            storedName,
                            input,
                            file.getSize(),
                            contentType
                    );


            registerRollbackCleanup(
                    fileUrl
            );

        } catch (IOException ex) {

            log.error(
                    "Failed to store file",
                    ex
            );


            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to store file"
            );
        }


        FileUpload entity =
                new FileUpload();


        entity.setOrganization(
                org
        );


        entity.setRelatedTable(
                relatedTable
        );


        entity.setRelatedId(
                meta.getRelatedId()
        );


        entity.setFileType(
                meta.getFileType() != null
                        ? meta.getFileType()
                        : guessType(
                        contentType,
                        original
                )
        );


        entity.setFileUrl(
                fileUrl
        );


        entity.setMimeType(
                contentType
        );


        entity.setSizeBytes(
                file.getSize()
        );


        entity.setSha256(
                sha
        );


        entity.setStorageProvider(
                currentStorageProvider()
        );


        entity.setUploadedBy(
                user
        );


        entity.setTags(
                meta.getTags() != null
                        ? new HashMap<>(
                        meta.getTags()
                )
                        : new HashMap<>()
        );


        FileUpload saved =
                persistWithConflictHandling(
                        entity
                );


        /*
         * Existing tally-sheet behavior remains intact.
         */
        maybeMirrorToTallySheet(
                saved
        );


        /*
         * Synchronize only the related entity's media field.
         */
        syncRelatedMediaField(
                relatedTable,
                meta.getRelatedId(),
                saved
        );


        return mapper.toDTO(
                saved
        );
    }


    // =========================================================================
    // CREATE BY URL
    //
    // Preserved because this is already part of the working FileUpload API.
    // If a FileUpload row is legitimately created this way, its related media
    // field is synchronized using the same central mechanism.
    // =========================================================================

    @Override
    @Transactional
    public FileUploadDto createByUrl(
            FileUploadCreateRequest req,
            UUID uploadedBy
    ) {

        if (req == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Upload request is required"
            );
        }


        Organization org =
                orgRepo
                        .findById(
                                req.getOrgId()
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


        String relatedTable =
                normalizeRelatedTable(
                        req.getRelatedTable()
                );


        requireRelatedExistsAndSameOrg(
                relatedTable,
                req.getRelatedId(),
                org.getOrgId()
        );


        if (
                req.getFileUrl() == null ||
                        req.getFileUrl().isBlank()
        ) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "fileUrl is required"
            );
        }


        if (
                req.getSizeBytes() != null &&
                        req.getSizeBytes() >
                                maxFileSizeBytes
        ) {

            throw new ResponseStatusException(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "File exceeds maximum allowed size"
            );
        }


        if (
                req.getSha256() != null &&
                        fileUploadRepository.existsActiveByOrgAndSha(
                                org.getOrgId(),
                                req.getSha256()
                        )
        ) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Duplicate file for this organization (same SHA-256)"
            );
        }


        FileUpload entity =
                new FileUpload();


        entity.setOrganization(
                org
        );


        entity.setRelatedTable(
                relatedTable
        );


        entity.setRelatedId(
                req.getRelatedId()
        );


        entity.setFileType(
                req.getFileType()
        );


        entity.setFileUrl(
                req.getFileUrl()
        );


        entity.setMimeType(
                req.getMimeType()
        );


        entity.setSizeBytes(
                req.getSizeBytes()
        );


        entity.setSha256(
                req.getSha256()
        );


        /*
         * createByUrl represents an already-known external/storage URL.
         * Preserve the existing request contract here.
         */
        entity.setStorageProvider(
                req.getStorageProvider() != null
                        ? req.getStorageProvider()
                        : StorageProvider.LOCAL
        );


        entity.setUploadedBy(
                user
        );


        entity.setTags(
                req.getTags() != null
                        ? new HashMap<>(
                        req.getTags()
                )
                        : new HashMap<>()
        );


        FileUpload saved =
                persistWithConflictHandling(
                        entity
                );


        maybeMirrorToTallySheet(
                saved
        );


        syncRelatedMediaField(
                relatedTable,
                req.getRelatedId(),
                saved
        );


        return mapper.toDTO(
                saved
        );
    }


    // =========================================================================
    // CREATE SUBMISSION WITH FILES
    //
    // Existing behavior preserved.
    // =========================================================================

    @Transactional
    public void createSubmissionWithFiles(
            VoteSubmission submission,
            List<MultipartFile> files,
            UUID uploaderId
    ) {

        log.info(
                "Bundling submission creation and files upload into a transaction."
        );


        Organization org =
                orgRepo
                        .findById(
                                submission
                                        .getOrganization()
                                        .getOrgId()
                        )
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "Organization not found."
                                        )
                        );


        SystemUser uploader =
                userRepo
                        .findById(
                                uploaderId
                        )
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "Uploader not found."
                                        )
                        );


        VoteSubmission savedSubmission =
                submissionRepo.save(
                        submission
                );


        if (files != null) {

            for (
                    MultipartFile file :
                    files
            ) {

                FileUploadCreateRequest meta =
                        new FileUploadCreateRequest();


                meta.setRelatedTable(
                        RELATED_TABLE_SUBMISSION
                );


                meta.setRelatedId(
                        savedSubmission
                                .getSubmissionId()
                );


                meta.setOrgId(
                        org.getOrgId()
                );


                meta.setFileType(
                        FileType.TALLY_SHEET
                );


                uploadMultipart(
                        meta,
                        file,
                        uploaderId
                );
            }
        }


        log.info(
                "Submission and files committed successfully for submissionId={}",
                savedSubmission.getSubmissionId()
        );
    }


    // =========================================================================
    // LIST
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<FileUploadDto> list(
            UUID orgId,
            String relatedTable,
            UUID relatedId
    ) {

        String normalized =
                normalizeRelatedTable(
                        relatedTable
                );


        return fileUploadRepository
                .listActive(
                        orgId,
                        normalized,
                        relatedId
                )
                .stream()
                .map(
                        mapper::toDTO
                )
                .toList();
    }


    // =========================================================================
    // SOFT DELETE
    // =========================================================================

    @Override
    @Transactional
    public void softDelete(
            UUID fileId,
            UUID requesterId
    ) {

        FileUpload file =
                fileUploadRepository
                        .findById(
                                fileId
                        )
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.NOT_FOUND,
                                                "File not found"
                                        )
                        );


        /*
         * Existing soft-delete behavior preserved.
         */
        if (
                file.isDeleted()
        ) {
            return;
        }


        file.softDelete();


        FileUpload saved =
                fileUploadRepository.save(
                        file
                );


        /*
         * Only clear an entity's primary-media field when that field
         * currently references THIS FileUpload.
         *
         * Other FileUpload records attached to the entity are untouched.
         */
        clearRelatedMediaFieldIfCurrent(
                saved
        );
    }


    // =========================================================================
    // GET
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public FileUploadDto get(
            UUID fileId
    ) {

        return fileUploadRepository
                .findById(
                        fileId
                )
                .map(
                        mapper::toDTO
                )
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "File not found"
                                )
                );
    }


    // =========================================================================
    // SAVE MULTIPLE FILES FOR ENTITY
    //
    // Used by ObserverReport and other existing entity workflows.
    // =========================================================================

    @Override
    @Transactional
    public List<FileUploadDto> saveAllForEntity(
            Organization org,
            String relatedTable,
            UUID relatedId,
            SystemUser uploadedBy,
            List<MultipartFile> files,
            Map<String, Object> tags
    ) {

        if (
                org == null ||
                        org.getOrgId() == null
        ) {

            throw new IllegalArgumentException(
                    "Organization is required"
            );
        }


        String normalizedTable =
                normalizeRelatedTable(
                        relatedTable
                );


        if (
                relatedId == null
        ) {

            throw new IllegalArgumentException(
                    "relatedId is required"
            );
        }


        if (
                uploadedBy == null ||
                        uploadedBy.getUserId() == null
        ) {

            throw new IllegalArgumentException(
                    "uploadedBy is required"
            );
        }


        if (
                files == null ||
                        files.isEmpty()
        ) {

            return List.of();
        }


        if (
                files.size() >
                        maxFilesPerRequest
        ) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Too many files in request"
            );
        }


        requireRelatedExistsAndSameOrg(
                normalizedTable,
                relatedId,
                org.getOrgId()
        );


        final String folder =
                buildFolder(
                        normalizedTable,
                        relatedId
                );


        final Map<String, Object> baseTags =
                tags != null
                        ? new HashMap<>(
                        tags
                )
                        : new HashMap<>();


        List<FileUploadDto> output =
                new ArrayList<>(
                        files.size()
                );


        for (
                MultipartFile file :
                files
        ) {

            if (
                    file == null ||
                            file.isEmpty()
            ) {
                continue;
            }


            if (
                    file.getSize() >
                            maxFileSizeBytes
            ) {

                throw new ResponseStatusException(
                        HttpStatus.PAYLOAD_TOO_LARGE,
                        "File exceeds maximum allowed size"
                );
            }


            String originalName =
                    sanitize(
                            file.getOriginalFilename()
                    );


            String contentType =
                    safeContentType(
                            file.getContentType(),
                            originalName
                    );


            validateAllowedContentType(
                    contentType
            );


            try (
                    InputStream hashStream =
                            file.getInputStream()
            ) {

                String sha256 =
                        DigestUtils.sha256Hex(
                                hashStream
                        );


                /*
                 * Preserve the existing de-duplication behavior.
                 *
                 * If the binary already exists for this organization,
                 * re-use its stored path.
                 *
                 * The target entity's media field can still reference
                 * that same stored binary.
                 */
                Optional<FileUpload> existing =
                        fileUploadRepository
                                .findActiveByOrgAndSha(
                                        org.getOrgId(),
                                        sha256
                                );


                if (
                        existing.isPresent()
                ) {

                    FileUpload existingFile =
                            existing.get();


                    syncRelatedMediaField(
                            normalizedTable,
                            relatedId,
                            existingFile
                    );


                    output.add(
                            mapper.toDTO(
                                    existingFile
                            )
                    );


                    continue;
                }


                try (
                        InputStream storageStream =
                                file.getInputStream()
                ) {

                    String safeName =
                            uniqueName(
                                    sha256,
                                    originalName
                            );


                    long size =
                            file.getSize();


                    String fileUrl =
                            storage.store(
                                    folder,
                                    safeName,
                                    storageStream,
                                    size,
                                    contentType
                            );


                    registerRollbackCleanup(
                            fileUrl
                    );


                    FileUpload entity =
                            new FileUpload();


                    entity.setOrganization(
                            org
                    );


                    entity.setRelatedTable(
                            normalizedTable
                    );


                    entity.setRelatedId(
                            relatedId
                    );


                    entity.setUploadedBy(
                            uploadedBy
                    );


                    entity.setFileUrl(
                            fileUrl
                    );


                    entity.setMimeType(
                            contentType
                    );


                    entity.setSizeBytes(
                            size
                    );


                    entity.setSha256(
                            sha256
                    );


                    entity.setStorageProvider(
                            currentStorageProvider()
                    );


                    entity.setTags(
                            mergedTags(
                                    baseTags,
                                    originalName,
                                    safeName
                            )
                    );


                    entity.setFileType(
                            guessType(
                                    contentType,
                                    originalName
                            )
                    );


                    FileUpload saved;


                    try {

                        saved =
                                fileUploadRepository.save(
                                        entity
                                );

                    } catch (
                            DataIntegrityViolationException duplicate
                    ) {

                        saved =
                                fileUploadRepository
                                        .findActiveByOrgAndSha(
                                                org.getOrgId(),
                                                sha256
                                        )
                                        .orElseThrow(
                                                () ->
                                                        duplicate
                                        );
                    }


                    /*
                     * Preserve existing tally functionality.
                     */
                    maybeMirrorToTallySheet(
                            saved
                    );


                    /*
                     * Update only the primary media field related
                     * to this FileUpload.
                     */
                    syncRelatedMediaField(
                            normalizedTable,
                            relatedId,
                            saved
                    );


                    output.add(
                            mapper.toDTO(
                                    saved
                            )
                    );
                }

            } catch (
                    ResponseStatusException ex
            ) {

                throw ex;

            } catch (
                    Exception ex
            ) {

                log.error(
                        "Failed to store file in saveAllForEntity: {}",
                        file.getOriginalFilename(),
                        ex
                );


                throw new RuntimeException(
                        "Failed to store file: "
                                + file.getOriginalFilename(),
                        ex
                );
            }
        }


        return output;
    }


    // =========================================================================
    // SYNCHRONIZE RELATED PRIMARY MEDIA FIELD
    // =========================================================================

    private void syncRelatedMediaField(
            String relatedTable,
            UUID relatedId,
            FileUpload file
    ) {

        if (
                file == null ||
                        relatedId == null ||
                        relatedTable == null
        ) {
            return;
        }


        String table =
                normalizeRelatedTable(
                        relatedTable
                );


        /*
         * Logo/photo/profile/picture fields must only be synchronized
         * from image uploads.
         *
         * This allows the same entity to have other FileUpload attachments
         * without accidentally replacing its primary image.
         */
        boolean image =
                isImage(
                        file
                );


        switch (table) {

            // =================================================================
            // PARTY LOGO
            // =================================================================

            case RELATED_TABLE_PARTY -> {

                if (!image) {
                    return;
                }


                Party party =
                        partyRepository
                                .findById(
                                        relatedId
                                )
                                .orElseThrow(
                                        () ->
                                                new ResponseStatusException(
                                                        HttpStatus.BAD_REQUEST,
                                                        "party not found"
                                                )
                                );


                party.setLogoUrl(
                        file.getFileUrl()
                );


                partyRepository.save(
                        party
                );
            }


            // =================================================================
            // CANDIDATE PHOTO
            // =================================================================

            case RELATED_TABLE_CANDIDATE -> {

                if (!image) {
                    return;
                }


                Candidate candidate =
                        candidateRepository
                                .findById(
                                        relatedId
                                )
                                .orElseThrow(
                                        () ->
                                                new ResponseStatusException(
                                                        HttpStatus.BAD_REQUEST,
                                                        "candidate not found"
                                                )
                                );


                candidate.setPhotoUrl(
                        file.getFileUrl()
                );


                candidateRepository.save(
                        candidate
                );
            }


            // =================================================================
            // ORGANIZATION LOGO
            // =================================================================

            case RELATED_TABLE_ORGANIZATION -> {

                if (!image) {
                    return;
                }


                Organization organization =
                        orgRepo
                                .findById(
                                        relatedId
                                )
                                .orElseThrow(
                                        () ->
                                                new ResponseStatusException(
                                                        HttpStatus.BAD_REQUEST,
                                                        "organization not found"
                                                )
                                );


                organization.setLogoUrl(
                        file.getFileUrl()
                );


                orgRepo.save(
                        organization
                );
            }


            // =================================================================
            // SYSTEM USER PROFILE IMAGE
            // =================================================================

            case RELATED_TABLE_SYSTEM_USERS -> {

                if (!image) {
                    return;
                }


                SystemUser user =
                        userRepo
                                .findById(
                                        relatedId
                                )
                                .orElseThrow(
                                        () ->
                                                new ResponseStatusException(
                                                        HttpStatus.BAD_REQUEST,
                                                        "system_user not found"
                                                )
                                );


                user.setProfileImageUrl(
                        file.getFileUrl()
                );


                user.setProfileImageUpload(
                        file
                );


                userRepo.save(
                        user
                );
            }


            // =================================================================
            // VOTER PICTURE
            // =================================================================

            case RELATED_TABLE_VOTER_REGISTRATION -> {

                if (!image) {
                    return;
                }


                VoterRegistration voter =
                        voterRegistrationRepository
                                .findById(
                                        relatedId
                                )
                                .orElseThrow(
                                        () ->
                                                new ResponseStatusException(
                                                        HttpStatus.BAD_REQUEST,
                                                        "voter_registration not found"
                                                )
                                );


                voter.setPictureUrl(
                        file.getFileUrl()
                );


                voterRegistrationRepository.save(
                        voter
                );
            }


            // =================================================================
            // OBSERVER REPORT MEDIA
            //
            // All files remain in file_upload.
            // mediaUrl is only the report's primary/first media reference.
            // =================================================================

            case RELATED_TABLE_OBSERVER_REPORT -> {

                ObserverReport report =
                        observerRepo
                                .findById(
                                        relatedId
                                )
                                .orElseThrow(
                                        () ->
                                                new ResponseStatusException(
                                                        HttpStatus.BAD_REQUEST,
                                                        "observer_report not found"
                                                )
                                );


                if (
                        report.getMediaUrl() == null ||
                                report.getMediaUrl().isBlank()
                ) {

                    report.setMediaUrl(
                            file.getFileUrl()
                    );


                    observerRepo.save(
                            report
                    );
                }
            }


            // =================================================================
            // ALL OTHER FILEUPLOAD RELATIONSHIPS
            //
            // Their existing behavior remains unchanged.
            // =================================================================

            default -> {
                // No primary media field to synchronize.
            }
        }
    }


    // =========================================================================
    // CLEAR RELATED PRIMARY MEDIA FIELD
    // =========================================================================

    private void clearRelatedMediaFieldIfCurrent(
            FileUpload file
    ) {

        if (
                file == null ||
                        file.getRelatedTable() == null ||
                        file.getRelatedId() == null
        ) {
            return;
        }


        String table =
                normalizeRelatedTable(
                        file.getRelatedTable()
                );


        UUID relatedId =
                file.getRelatedId();


        String fileUrl =
                file.getFileUrl();


        switch (table) {

            // =================================================================
            // PARTY
            // =================================================================

            case RELATED_TABLE_PARTY ->

                    partyRepository
                            .findById(
                                    relatedId
                            )
                            .ifPresent(
                                    party -> {

                                        if (
                                                Objects.equals(
                                                        party.getLogoUrl(),
                                                        fileUrl
                                                )
                                        ) {

                                            party.setLogoUrl(
                                                    null
                                            );


                                            partyRepository.save(
                                                    party
                                            );
                                        }
                                    }
                            );


            // =================================================================
            // CANDIDATE
            // =================================================================

            case RELATED_TABLE_CANDIDATE ->

                    candidateRepository
                            .findById(
                                    relatedId
                            )
                            .ifPresent(
                                    candidate -> {

                                        if (
                                                Objects.equals(
                                                        candidate.getPhotoUrl(),
                                                        fileUrl
                                                )
                                        ) {

                                            candidate.setPhotoUrl(
                                                    null
                                            );


                                            candidateRepository.save(
                                                    candidate
                                            );
                                        }
                                    }
                            );


            // =================================================================
            // ORGANIZATION
            // =================================================================

            case RELATED_TABLE_ORGANIZATION ->

                    orgRepo
                            .findById(
                                    relatedId
                            )
                            .ifPresent(
                                    organization -> {

                                        if (
                                                Objects.equals(
                                                        organization.getLogoUrl(),
                                                        fileUrl
                                                )
                                        ) {

                                            organization.setLogoUrl(
                                                    null
                                            );


                                            orgRepo.save(
                                                    organization
                                            );
                                        }
                                    }
                            );


            // =================================================================
            // SYSTEM USER
            // =================================================================

            case RELATED_TABLE_SYSTEM_USERS ->

                    userRepo
                            .findById(
                                    relatedId
                            )
                            .ifPresent(
                                    user -> {

                                        boolean changed =
                                                false;


                                        if (
                                                Objects.equals(
                                                        user.getProfileImageUrl(),
                                                        fileUrl
                                                )
                                        ) {

                                            user.setProfileImageUrl(
                                                    null
                                            );


                                            changed =
                                                    true;
                                        }


                                        if (
                                                user.getProfileImageUpload() != null &&
                                                        Objects.equals(
                                                                user
                                                                        .getProfileImageUpload()
                                                                        .getFileId(),

                                                                file.getFileId()
                                                        )
                                        ) {

                                            user.setProfileImageUpload(
                                                    null
                                            );


                                            changed =
                                                    true;
                                        }


                                        if (changed) {

                                            userRepo.save(
                                                    user
                                            );
                                        }
                                    }
                            );


            // =================================================================
            // VOTER
            // =================================================================

            case RELATED_TABLE_VOTER_REGISTRATION ->

                    voterRegistrationRepository
                            .findById(
                                    relatedId
                            )
                            .ifPresent(
                                    voter -> {

                                        if (
                                                Objects.equals(
                                                        voter.getPictureUrl(),
                                                        fileUrl
                                                )
                                        ) {

                                            voter.setPictureUrl(
                                                    null
                                            );


                                            voterRegistrationRepository.save(
                                                    voter
                                            );
                                        }
                                    }
                            );


            // =================================================================
            // OBSERVER REPORT
            // =================================================================

            case RELATED_TABLE_OBSERVER_REPORT ->

                    observerRepo
                            .findById(
                                    relatedId
                            )
                            .ifPresent(
                                    report -> {

                                        if (
                                                Objects.equals(
                                                        report.getMediaUrl(),
                                                        fileUrl
                                                )
                                        ) {

                                            report.setMediaUrl(
                                                    null
                                            );


                                            observerRepo.save(
                                                    report
                                            );
                                        }
                                    }
                            );


            default -> {
                // No primary media field.
            }
        }
    }


    // =========================================================================
    // RELATED ENTITY VALIDATION
    // =========================================================================

    private void requireRelatedExistsAndSameOrg(
            String table,
            UUID relatedId,
            UUID orgId
    ) {

        if (
                relatedId == null
        ) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "related_id is required"
            );
        }


        String normalized =
                normalizeRelatedTable(
                        table
                );


        if (
                !ALLOWED_TABLES.contains(
                        normalized
                )
        ) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unsupported related_table: "
                            + table
            );
        }


        switch (normalized) {

            // =================================================================
            // SYSTEM USERS
            // =================================================================

            case "system_users" -> {

                SystemUser user =
                        userRepo
                                .findById(
                                        relatedId
                                )
                                .orElseThrow(
                                        () ->
                                                new ResponseStatusException(
                                                        HttpStatus.BAD_REQUEST,
                                                        "system_user not found"
                                                )
                                );


                if (
                        user.getDefaultOrg() != null &&
                                user.getDefaultOrg()
                                        .getOrgId() != null &&
                                !user.getDefaultOrg()
                                        .getOrgId()
                                        .equals(
                                                orgId
                                        )
                ) {

                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "system_user belongs to another organization"
                    );
                }
            }


            // =================================================================
            // VOTE SUBMISSION
            // =================================================================

            case "vote_submission" -> {

                VoteSubmission submission =
                        submissionRepo
                                .findById(
                                        relatedId
                                )
                                .orElseThrow(
                                        () ->
                                                new ResponseStatusException(
                                                        HttpStatus.BAD_REQUEST,
                                                        "vote_submission not found"
                                                )
                                );


                if (
                        !submission
                                .getOrganization()
                                .getOrgId()
                                .equals(
                                        orgId
                                )
                ) {

                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "vote_submission belongs to another organization"
                    );
                }
            }


            // =================================================================
            // TALLY SHEET
            // =================================================================

            case "tally_sheet" -> {

                TallySheet tally =
                        tallyRepo
                                .findById(
                                        relatedId
                                )
                                .orElseThrow(
                                        () ->
                                                new ResponseStatusException(
                                                        HttpStatus.BAD_REQUEST,
                                                        "tally_sheet not found"
                                                )
                                );


                if (
                        !tally
                                .getOrganization()
                                .getOrgId()
                                .equals(
                                        orgId
                                )
                ) {

                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "tally_sheet belongs to another organization"
                    );
                }
            }


            // =================================================================
            // OBSERVER REPORT
            // =================================================================

            case "observer_report" -> {

                ObserverReport report =
                        observerRepo
                                .findById(
                                        relatedId
                                )
                                .orElseThrow(
                                        () ->
                                                new ResponseStatusException(
                                                        HttpStatus.BAD_REQUEST,
                                                        "observer_report not found"
                                                )
                                );


                if (
                        !report
                                .getOrganization()
                                .getOrgId()
                                .equals(
                                        orgId
                                )
                ) {

                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "observer_report belongs to another organization"
                    );
                }
            }


            // =================================================================
            // CHAT MESSAGE
            // =================================================================

            case "chat_message" -> {

                ChatMessage message =
                        chatRepo
                                .findById(
                                        relatedId
                                )
                                .orElseThrow(
                                        () ->
                                                new ResponseStatusException(
                                                        HttpStatus.BAD_REQUEST,
                                                        "chat_message not found"
                                                )
                                );


                if (
                        !message
                                .getOrganization()
                                .getOrgId()
                                .equals(
                                        orgId
                                )
                ) {

                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "chat_message belongs to another organization"
                    );
                }
            }


            // =================================================================
            // PARTY
            //
            // Global record. Existence check only.
            // =================================================================

            case "party" ->

                    partyRepository
                            .findById(
                                    relatedId
                            )
                            .orElseThrow(
                                    () ->
                                            new ResponseStatusException(
                                                    HttpStatus.BAD_REQUEST,
                                                    "party not found"
                                            )
                            );


            // =================================================================
            // CANDIDATE
            //
            // Global master record. Existence check only.
            // =================================================================

            case "candidate" ->

                    candidateRepository
                            .findById(
                                    relatedId
                            )
                            .orElseThrow(
                                    () ->
                                            new ResponseStatusException(
                                                    HttpStatus.BAD_REQUEST,
                                                    "candidate not found"
                                            )
                            );


            // =================================================================
            // ORGANIZATION
            //
            // Existing authorization remains outside FileUploadService.
            // We only confirm the related entity exists.
            // =================================================================

            case "organization" ->

                    orgRepo
                            .findById(
                                    relatedId
                            )
                            .orElseThrow(
                                    () ->
                                            new ResponseStatusException(
                                                    HttpStatus.BAD_REQUEST,
                                                    "organization not found"
                                            )
                            );


            // =================================================================
            // VOTER REGISTRATION
            // =================================================================

            case "voter_registration" -> {

                VoterRegistration voter =
                        voterRegistrationRepository
                                .findById(
                                        relatedId
                                )
                                .orElseThrow(
                                        () ->
                                                new ResponseStatusException(
                                                        HttpStatus.BAD_REQUEST,
                                                        "voter_registration not found"
                                                )
                                );


                /*
                 * Voter registration already has an owning organization.
                 * Only enforce the match when that relationship exists.
                 */
                if (
                        voter.getOrg() != null &&
                                voter.getOrg()
                                        .getOrgId() != null &&
                                !voter.getOrg()
                                        .getOrgId()
                                        .equals(
                                                orgId
                                        )
                ) {

                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "voter_registration belongs to another organization"
                    );
                }
            }


            default -> {
                // Whitelist already handles unsupported tables.
            }
        }
    }


    // =========================================================================
    // EXISTING TALLY-SHEET MIRROR
    // =========================================================================

    private void maybeMirrorToTallySheet(
            FileUpload saved
    ) {

        if (
                saved == null ||
                        saved.getFileType() !=
                                FileType.TALLY_SHEET ||
                        !RELATED_TABLE_SUBMISSION.equals(
                                saved.getRelatedTable()
                        )
        ) {

            return;
        }


        VoteSubmission submission =
                submissionRepo
                        .findById(
                                saved.getRelatedId()
                        )
                        .orElse(
                                null
                        );


        if (
                submission == null ||
                        submission.getOrganization() == null ||
                        !submission
                                .getOrganization()
                                .getOrgId()
                                .equals(
                                        saved
                                                .getOrganization()
                                                .getOrgId()
                                )
        ) {

            return;
        }


        TallySheet tally =
                new TallySheet();


        tally.setOrganization(
                saved.getOrganization()
        );


        tally.setSubmission(
                submission
        );


        tally.setImageUrl(
                saved.getFileUrl()
        );


        tally.setFileSha256(
                saved.getSha256()
        );


        tallyRepo.save(
                tally
        );
    }


    // =========================================================================
    // PERSIST WITH DUPLICATE HANDLING
    // =========================================================================

    private FileUpload persistWithConflictHandling(
            FileUpload file
    ) {

        try {

            return fileUploadRepository.save(
                    file
            );

        } catch (
                DataIntegrityViolationException ex
        ) {

            if (
                    file.getSha256() != null &&
                            file.getOrganization() != null
            ) {

                Optional<FileUpload> existing =
                        fileUploadRepository
                                .findActiveByOrgAndSha(
                                        file
                                                .getOrganization()
                                                .getOrgId(),

                                        file.getSha256()
                                );


                if (
                        existing.isPresent()
                ) {

                    return existing.get();
                }
            }


            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Duplicate file for this organization",
                    ex
            );
        }
    }


    // =========================================================================
    // ROLLBACK CLEANUP
    // =========================================================================

    private void registerRollbackCleanup(
            String fileUrl
    ) {

        if (
                fileUrl == null ||
                        fileUrl.isBlank()
        ) {
            return;
        }


        if (
                !TransactionSynchronizationManager
                        .isSynchronizationActive()
        ) {

            return;
        }


        TransactionSynchronizationManager
                .registerSynchronization(
                        new TransactionSynchronization() {

                            @Override
                            public void afterCompletion(
                                    int status
                            ) {

                                if (
                                        status ==
                                                TransactionSynchronization
                                                        .STATUS_ROLLED_BACK
                                ) {

                                    try {

                                        log.warn(
                                                "Transaction rolled back; deleting stored file {}",
                                                fileUrl
                                        );


                                        storage.delete(
                                                fileUrl
                                        );

                                    } catch (
                                            Exception ex
                                    ) {

                                        log.error(
                                                "Failed to delete stored file after rollback: {}",
                                                fileUrl,
                                                ex
                                        );
                                    }
                                }
                            }
                        }
                );
    }


    // =========================================================================
    // STORAGE PROVIDER
    // =========================================================================

    private StorageProvider currentStorageProvider() {

        try {

            return StorageProvider.valueOf(
                    storage
                            .getProviderName()
                            .toUpperCase(
                                    Locale.ROOT
                            )
            );

        } catch (
                Exception ex
        ) {

            return StorageProvider.LOCAL;
        }
    }


    // =========================================================================
    // IMAGE CHECK
    // =========================================================================

    private static boolean isImage(
            FileUpload file
    ) {

        if (
                file.getFileType() ==
                        FileType.PHOTO
        ) {

            return true;
        }


        String mimeType =
                file.getMimeType();


        return mimeType != null &&
                mimeType
                        .toLowerCase(
                                Locale.ROOT
                        )
                        .startsWith(
                                "image/"
                        );
    }


    // =========================================================================
    // NORMALIZE RELATED TABLE
    // =========================================================================

    private static String normalizeRelatedTable(
            String table
    ) {

        if (
                table == null ||
                        table.isBlank()
        ) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "related_table is required"
            );
        }


        return table
                .trim()
                .toLowerCase(
                        Locale.ROOT
                );
    }


    // =========================================================================
    // VALIDATE MIME TYPE
    // =========================================================================

    private void validateAllowedContentType(
            String contentType
    ) {

        if (
                contentType == null ||
                        !getAllowedMimeTypes()
                                .contains(
                                        contentType
                                                .toLowerCase(
                                                        Locale.ROOT
                                                )
                                )
        ) {

            throw new ResponseStatusException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "File content type not allowed: "
                            + contentType
            );
        }
    }


    // =========================================================================
    // BUILD STORAGE FOLDER
    // =========================================================================

    private static String buildFolder(
            String relatedTable,
            UUID relatedId
    ) {

        return relatedTable
                + "/"
                + relatedId
                + "/"
                + LocalDate.now();
    }


    // =========================================================================
    // SANITIZE FILE NAME
    // =========================================================================

    private static String sanitize(
            String name
    ) {

        if (
                name == null ||
                        name.isBlank()
        ) {

            return "file";
        }


        String base =
                name.replace(
                        "\\",
                        "/"
                );


        base =
                base.substring(
                        base.lastIndexOf('/') + 1
                );


        return base.replaceAll(
                "[\\r\\n]",
                "_"
        );
    }


    // =========================================================================
    // CONTENT-ADDRESSED FILE NAME
    // =========================================================================

    private static String uniqueName(
            String sha256,
            String originalName
    ) {

        String extension =
                "";


        int dot =
                originalName.lastIndexOf(
                        '.'
                );


        if (
                dot > -1 &&
                        dot <
                                originalName.length() - 1
        ) {

            extension =
                    originalName
                            .substring(
                                    dot
                            )
                            .toLowerCase(
                                    Locale.ROOT
                            );
        }


        return sha256 +
                extension;
    }


    // =========================================================================
    // EXTRACT EXTENSION
    // =========================================================================

    private static String getExtension(
            String filename
    ) {

        if (
                filename == null ||
                        filename.isBlank()
        ) {

            return "";
        }


        int dot =
                filename.lastIndexOf(
                        '.'
                );


        if (
                dot < 0 ||
                        dot ==
                                filename.length() - 1
        ) {

            return "";
        }


        return filename
                .substring(
                        dot + 1
                )
                .replaceAll(
                        "[^a-zA-Z0-9]",
                        ""
                )
                .toLowerCase(
                        Locale.ROOT
                );
    }


    // =========================================================================
    // SAFE CONTENT TYPE
    // =========================================================================

    private static String safeContentType(
            String provided,
            String filename
    ) {

        if (
                provided != null &&
                        !provided.isBlank()
        ) {

            return provided
                    .trim()
                    .toLowerCase(
                            Locale.ROOT
                    );
        }


        String lower =
                filename == null
                        ? ""
                        : filename.toLowerCase(
                        Locale.ROOT
                );


        if (
                lower.endsWith(
                        ".jpg"
                ) ||
                        lower.endsWith(
                                ".jpeg"
                        )
        ) {

            return MediaType.IMAGE_JPEG_VALUE;
        }


        if (
                lower.endsWith(
                        ".png"
                )
        ) {

            return MediaType.IMAGE_PNG_VALUE;
        }


        if (
                lower.endsWith(
                        ".webp"
                )
        ) {

            return "image/webp";
        }


        if (
                lower.endsWith(
                        ".gif"
                )
        ) {

            return MediaType.IMAGE_GIF_VALUE;
        }


        if (
                lower.endsWith(
                        ".pdf"
                )
        ) {

            return "application/pdf";
        }


        if (
                lower.endsWith(
                        ".mp4"
                )
        ) {

            return "video/mp4";
        }


        if (
                lower.endsWith(
                        ".mov"
                )
        ) {

            return "video/quicktime";
        }


        return MediaType
                .APPLICATION_OCTET_STREAM_VALUE;
    }


    // =========================================================================
    // MERGE TAGS
    // =========================================================================

    private static Map<String, Object> mergedTags(
            Map<String, Object> base,
            String original,
            String stored
    ) {

        Map<String, Object> tags =
                new HashMap<>(
                        base
                );


        tags.putIfAbsent(
                "original_name",
                original
        );


        tags.putIfAbsent(
                "stored_name",
                stored
        );


        return tags;
    }


    // =========================================================================
    // GUESS FILE TYPE
    // =========================================================================

    private static FileType guessType(
            String mime,
            String filename
    ) {

        String normalizedMime =
                mime == null
                        ? ""
                        : mime.toLowerCase(
                        Locale.ROOT
                );


        String normalizedFilename =
                filename == null
                        ? ""
                        : filename.toLowerCase(
                        Locale.ROOT
                );


        if (
                normalizedMime.startsWith(
                        "image/"
                ) ||
                        normalizedFilename.matches(
                                ".*\\.(png|jpg|jpeg|gif|webp|bmp)$"
                        )
        ) {

            return FileType.PHOTO;
        }


        if (
                normalizedMime.startsWith(
                        "video/"
                ) ||
                        normalizedFilename.matches(
                                ".*\\.(mp4|mov|avi|mkv|webm)$"
                        )
        ) {

            return FileType.VIDEO;
        }


        if (
                normalizedMime.startsWith(
                        "audio/"
                ) ||
                        normalizedFilename.matches(
                                ".*\\.(mp3|wav|m4a|aac|ogg)$"
                        )
        ) {

            return FileType.AUDIO;
        }


        if (
                normalizedFilename.endsWith(
                        ".pdf"
                ) ||
                        normalizedMime.equals(
                                "application/pdf"
                        )
        ) {

            return FileType.DOCUMENT;
        }


        return FileType.DOCUMENT;
    }


    // =========================================================================
    // SHA-256
    // =========================================================================

    private static String safeSha256(
            MultipartFile file
    ) {

        try {

            MessageDigest digest =
                    MessageDigest.getInstance(
                            "SHA-256"
                    );


            try (
                    InputStream input =
                            file.getInputStream()
            ) {

                byte[] buffer =
                        new byte[8192];


                int read;


                while (
                        (
                                read =
                                        input.read(
                                                buffer
                                        )
                        ) != -1
                ) {

                    digest.update(
                            buffer,
                            0,
                            read
                    );
                }
            }


            byte[] hash =
                    digest.digest();


            StringBuilder output =
                    new StringBuilder(
                            hash.length * 2
                    );


            for (
                    byte value :
                    hash
            ) {

                output.append(
                        String.format(
                                "%02x",
                                value
                        )
                );
            }


            return output.toString();

        } catch (
                Exception ex
        ) {

            log.warn(
                    "Unable to compute SHA-256 for file {}: {}",
                    file.getOriginalFilename(),
                    ex.getMessage()
            );


            return null;
        }
    }


    // =========================================================================
    // EXISTING PRIVATE ATOMIC UPLOAD HELPER
    //
    // Retained to avoid changing unrelated existing behavior.
    // =========================================================================

    private void uploadFilesAtomic(
            List<MultipartFile> files,
            Organization org,
            SystemUser uploader,
            String relatedTable,
            UUID relatedId
    ) {

        if (
                files == null ||
                        files.isEmpty()
        ) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Files are required for upload"
            );
        }


        for (
                MultipartFile file :
                files
        ) {

            if (
                    file.isEmpty()
            ) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "File cannot be empty: "
                                + file.getOriginalFilename()
                );
            }


            if (
                    file.getSize() >
                            maxFileSizeBytes
            ) {

                throw new ResponseStatusException(
                        HttpStatus.PAYLOAD_TOO_LARGE,
                        "File exceeds maximum allowed size: "
                                + file.getOriginalFilename()
                );
            }


            String contentType =
                    safeContentType(
                            file.getContentType(),
                            file.getOriginalFilename()
                    );


            validateAllowedContentType(
                    contentType
            );


            try {

                uploadSingleFile(
                        org,
                        uploader,
                        file,
                        relatedTable,
                        relatedId,
                        contentType
                );

            } catch (
                    Exception ex
            ) {

                log.error(
                        "File upload failed during transaction: relatedTable={}, relatedId={}, file={}",
                        relatedTable,
                        relatedId,
                        file.getOriginalFilename(),
                        ex
                );


                throw new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "File upload failed: "
                                + file.getOriginalFilename(),
                        ex
                );
            }
        }
    }


    // =========================================================================
    // EXISTING PRIVATE SINGLE-FILE HELPER
    //
    // Retained and aligned with the active FileStorageService.
    // =========================================================================

    private void uploadSingleFile(
            Organization org,
            SystemUser uploader,
            MultipartFile file,
            String relatedTable,
            UUID relatedId,
            String contentType
    ) throws IOException {

        String normalizedTable =
                normalizeRelatedTable(
                        relatedTable
                );


        String sha256 =
                safeSha256(
                        file
                );


        if (
                sha256 != null &&
                        fileUploadRepository.existsActiveByOrgAndSha(
                                org.getOrgId(),
                                sha256
                        )
        ) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Duplicate file for organization: "
                            + file.getOriginalFilename()
            );
        }


        String originalName =
                Objects.requireNonNullElse(
                        file.getOriginalFilename(),
                        "unknown.bin"
                );


        String uniqueName =
                UUID.randomUUID()
                        + "-"
                        + sanitize(
                        originalName
                );


        String fileUrl;


        try (
                InputStream inputStream =
                        file.getInputStream()
        ) {

            fileUrl =
                    storage.store(
                            normalizedTable,
                            uniqueName,
                            inputStream,
                            file.getSize(),
                            contentType
                    );
        }


        registerRollbackCleanup(
                fileUrl
        );


        FileUpload upload =
                new FileUpload();


        upload.setOrganization(
                org
        );


        upload.setUploadedBy(
                uploader
        );


        upload.setRelatedTable(
                normalizedTable
        );


        upload.setRelatedId(
                relatedId
        );


        upload.setFileType(
                guessType(
                        contentType,
                        originalName
                )
        );


        upload.setFileUrl(
                fileUrl
        );


        upload.setMimeType(
                contentType
        );


        upload.setSizeBytes(
                file.getSize()
        );


        upload.setSha256(
                sha256
        );


        upload.setStorageProvider(
                currentStorageProvider()
        );


        FileUpload saved =
                fileUploadRepository.save(
                        upload
                );


        syncRelatedMediaField(
                normalizedTable,
                relatedId,
                saved
        );


        log.debug(
                "Uploaded file: relatedTable={}, relatedId={}, file={}, url={}",
                normalizedTable,
                relatedId,
                file.getOriginalFilename(),
                fileUrl
        );
    }
}