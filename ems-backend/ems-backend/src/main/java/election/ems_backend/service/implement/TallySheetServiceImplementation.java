package election.ems_backend.service.implement;


import election.ems_backend.dto.FileUploadDto;
import election.ems_backend.dto.TallySheetCreateByUrlRequest;
import election.ems_backend.dto.TallySheetDto;
import election.ems_backend.entity.Organization;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.entity.TallySheet;
import election.ems_backend.entity.VoteSubmission;
import election.ems_backend.mapper.TallySheetMapper;
import election.ems_backend.repository.OrganizationRepository;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.repository.TallySheetRepository;
import election.ems_backend.repository.VoteSubmissionRepository;
import election.ems_backend.service.FileStorageService;
import election.ems_backend.service.FileUploadService;
import election.ems_backend.service.TallySheetService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.InputStream;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class TallySheetServiceImplementation implements TallySheetService {

    private final TallySheetRepository repo;
    private final OrganizationRepository orgRepo;
    private final VoteSubmissionRepository submissionRepo;
    private final FileUploadService fileUploadService;   // ✅ add
    private final SystemUserRepository userRepo;

    @Autowired
    private FileStorageService storage;

    private final TallySheetMapper mapper = new TallySheetMapper();



    /**
     * Final implementation: store the file in the unified FileUpload pipeline and
     * bind it to the created TallySheet row (related_table = "tally_sheet", related_id = uploadId).
     */
    @Override
    @Transactional
    public TallySheetDto upload(UUID orgId, UUID submissionId, MultipartFile file) {
        Organization org = orgRepo.findById(orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));
        VoteSubmission sub = submissionRepo.findById(submissionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Submission not found"));

        // Org consistency guard
        if (!sub.getOrganization().getOrgId().equals(org.getOrgId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Submission belongs to a different organization");
        }
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is required");
        }

        // SHA-256 for duplicate protection at submission scope
        String sha = sha256(file);
        if (sha != null && repo.existsBySubmissionAndSha(submissionId, sha)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Duplicate file (same SHA-256) for this submission");
        }

        // Resolve uploader = submission agent (required for audit trail)
        SystemUser uploadedBy = Optional.ofNullable(sub.getAgent())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Submission has no agent/uploader"));

        // 1) Create TallySheet first (to get uploadId we will reference from file_upload)
        TallySheet t = new TallySheet();
        t.setOrganization(org);
        t.setSubmission(sub);
        t.setDateUploaded(LocalDateTime.now());
        TallySheet saved = repo.save(t);

        // 2) Store via FileUploadService and bind to this tally sheet
        Map<String, Object> tags = new HashMap<>();
        if (sha != null) tags.put("sha256", sha);
        tags.put("kind", "tally_sheet");

        List<FileUploadDto> created = fileUploadService.saveAllForEntity(
                org,
                "tally_sheet",
                saved.getUploadId(),
                uploadedBy,
                List.of(file),
                tags
        );
        FileUploadDto f = created.get(0);

        // 3) Backfill tally_sheet URL & SHA then persist
        saved.setImageUrl(f.getFileUrl());
        saved.setFileSha256(f.getSha256() != null ? f.getSha256() : sha);
        saved = repo.save(saved);

        return mapper.toDTO(saved);
    }


    @Override
    @Transactional
    public TallySheetDto createByUrl(TallySheetCreateByUrlRequest req) {
        Organization org = orgRepo.findById(req.getOrgId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));
        VoteSubmission sub = submissionRepo.findById(req.getSubmissionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Submission not found"));

        if (!sub.getOrganization().getOrgId().equals(org.getOrgId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Submission belongs to a different organization");
        }
        if (req.getImageUrl() == null || req.getImageUrl().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "imageUrl is required");
        }
        if (req.getFileSha256() != null && repo.existsBySubmissionAndSha(req.getSubmissionId(), req.getFileSha256())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Duplicate file (same SHA-256) for this submission");
        }

        TallySheet t = new TallySheet();
        t.setOrganization(org);
        t.setSubmission(sub);
        t.setImageUrl(req.getImageUrl());
        t.setFileSha256(req.getFileSha256());
        t.setOcrExtracted(req.getOcrExtracted());
        t.setDateUploaded(LocalDateTime.now());

        return mapper.toDTO(repo.save(t));
    }

    @Override
    @Transactional
    public TallySheetDto setOcr(UUID uploadId, String ocrJson) {
        TallySheet t = repo.findById(uploadId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tally sheet not found"));
        t.setOcrExtracted(ocrJson);
        return mapper.toDTO(repo.save(t));
    }

    @Override
    @Transactional(readOnly = true)
    public List<TallySheetDto> listBySubmission(UUID submissionId) {
        return repo.findBySubmission_SubmissionIdOrderByDateUploadedDesc(submissionId)
                .stream().map(mapper::toDTO).toList();
    }

    @Override
    @Transactional
    public void delete(UUID uploadId) {
        if (!repo.existsById(uploadId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tally sheet not found");
        }
        repo.deleteById(uploadId);
    }

    @Override
    @Transactional(readOnly = true)
    public TallySheetDto get(UUID uploadId) {
        return repo.findById(uploadId)
                .map(mapper::toDTO)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tally sheet not found"));
    }

    // ---------- helpers ----------
    private static String sha256(MultipartFile file) {
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
            return null; // don’t fail upload if hashing fails
        }
    }
}
