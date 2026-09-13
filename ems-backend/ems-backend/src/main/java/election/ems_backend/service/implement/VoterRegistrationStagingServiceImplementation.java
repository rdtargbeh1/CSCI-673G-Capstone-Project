package election.ems_backend.service.implement;

import election.ems_backend.dto.VoterRegistrationStagingCreateRequest;
import election.ems_backend.dto.VoterRegistrationStagingDto;
import election.ems_backend.entity.PollingCenter;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.entity.VoterRegistration;
import election.ems_backend.entity.VoterRegistrationStaging;
import election.ems_backend.mapper.VoterRegistrationStagingMapper;
import election.ems_backend.repository.PollingCenterRepository;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.repository.VoterRegistrationRepository;
import election.ems_backend.repository.VoterRegistrationStagingRepository;
import election.ems_backend.service.AuditLogService;
import election.ems_backend.service.VoterRegistrationStagingService;
import election.ems_backend.utility.HmacUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
@Transactional
public class VoterRegistrationStagingServiceImplementation implements VoterRegistrationStagingService {

    private final VoterRegistrationStagingRepository stagingRepo;
    private final VoterRegistrationRepository voterRepo;
    private final PollingCenterRepository centerRepo;
    private final SystemUserRepository userRepo;
    private final AuditLogService auditLogService;
    private final VoterRegistrationStagingMapper mapper = new VoterRegistrationStagingMapper();

    @Value("${app.secrets.lookup-hmac-key:default-insecure-key-do-not-use}")
    private String lookupHmacKey;

    @Override
    public VoterRegistrationStagingDto submitRow(VoterRegistrationStagingCreateRequest req) {
        if (req == null) throw new ResponseStatusException(BAD_REQUEST, "Missing request");

        VoterRegistrationStaging s = new VoterRegistrationStaging();
        s.setStagingId(UUID.randomUUID());
        s.setBatchId(null); // caller may set batch via separate endpoint; keep null allowed
        s.setNationalId(req.getNationalId());
        s.setFullName(req.getFullName());
        s.setDob(req.getDob());
        s.setAssignedCenterCode(req.getAssignedCenterCode());

        if (req.getImportedByUserId() != null) {
            UUID importedBy = UUID.fromString(req.getImportedByUserId());
            userRepo.findById(importedBy).ifPresent(s::setImportedBy);
        }
        s.setImportTime(LocalDateTime.now());
        s.setValidated(false);
        s.setValidationErrors(null);
        s.setProcessed(false);

        VoterRegistrationStaging saved = stagingRepo.save(s);
        return mapper.toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<VoterRegistrationStagingDto> listByBatch(UUID batchId) {
        return stagingRepo.findByBatchId(batchId).stream().map(mapper::toDto).collect(Collectors.toList());
    }

    @Override
    public int validateBatch(UUID batchId, UUID validatorUserId) {
        List<VoterRegistrationStaging> rows;
        if (batchId == null) {
            rows = stagingRepo.findByValidatedFalseAndProcessedFalse();
        } else {
            rows = stagingRepo.findByBatchId(batchId).stream()
                    .filter(s -> Boolean.FALSE.equals(s.getValidated()))
                    .collect(Collectors.toList());
        }

        if (rows.isEmpty()) return 0;

        SystemUser validator = null;
        if (validatorUserId != null) {
            validator = userRepo.findById(validatorUserId)
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Validator user not found"));
        }

        int updated = 0;
        for (VoterRegistrationStaging s : rows) {
            List<String> errors = new ArrayList<>();

            if (s.getNationalId() == null || s.getNationalId().isBlank()) {
                errors.add("nationalId is required");
            }
            if (s.getFullName() == null || s.getFullName().isBlank()) {
                errors.add("fullName is required");
            }
            // optional DOB validation
            if (s.getDob() == null) {
                // accept null DOB, or enforce depending on policy
            }

            // center resolution
            UUID resolvedCenterId = null;
            if (s.getAssignedCenterCode() != null && !s.getAssignedCenterCode().isBlank()) {
                Optional<PollingCenter> pcOpt = centerRepo.findByCodeIgnoreCase(s.getAssignedCenterCode());
                if (pcOpt.isPresent()) {
                    resolvedCenterId = pcOpt.get().getCenterId();
                } else {
                    errors.add("assigned_center_code not found: " + s.getAssignedCenterCode());
                }
            }

            // duplicate detection against existing voters via lookup hash
            if (s.getNationalId() != null && !s.getNationalId().isBlank()) {
                String lookup = HmacUtils.hmacSha256Hex(s.getNationalId().trim(), lookupHmacKey);
                if (voterRepo.findByLookupHash(lookup).isPresent()) {
                    errors.add("duplicate national identifier (existing registration)");
                }
            }

            if (errors.isEmpty()) {
                s.setValidated(true);
                s.setValidationErrors(null);
                // store the resolved center code as assigned_center_code remains for trace; we can set polling center id later at promotion
            } else {
                s.setValidated(false);
                s.setValidationErrors(String.join("; ", errors));
            }

            if (validator != null) {
                s.setValidatedBy(validator);
                s.setValidatedAt(LocalDateTime.now());
            } else {
                s.setValidatedAt(LocalDateTime.now());
            }

            stagingRepo.save(s);
            updated++;
        }

        // audit
        try {
            auditLogService.logUpdate(null, validatorUserId, "VoterRegistrationStaging",
                    "Validated staging rows batch=" + (batchId != null ? batchId : "ALL") + " rows=" + updated);
        } catch (Exception ex) {
            // best-effort
        }

        return updated;
    }

    @Override
    public int promoteBatch(UUID batchId, UUID actorUserId) {
        List<VoterRegistrationStaging> rows;
        if (batchId == null) {
            rows = stagingRepo.findByProcessedFalseAndValidatedTrue();
        } else {
            rows = stagingRepo.findByBatchId(batchId).stream()
                    .filter(s -> Boolean.TRUE.equals(s.getValidated()) && Boolean.FALSE.equals(s.getProcessed()))
                    .collect(Collectors.toList());
        }

        if (rows.isEmpty()) return 0;

        SystemUser actor = null;
        if (actorUserId != null) {
            actor = userRepo.findById(actorUserId)
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Actor user not found"));
        }

        int promoted = 0;
        for (VoterRegistrationStaging s : rows) {
            try {
                // compute lookup hash
                String lookup = HmacUtils.hmacSha256Hex(s.getNationalId().trim(), lookupHmacKey);

                // safety: double-check no duplicate race condition
                if (voterRepo.findByLookupHash(lookup).isPresent()) {
                    s.setProcessed(false);
                    s.setValidationErrors((s.getValidationErrors() == null ? "" : s.getValidationErrors() + "; ")
                            + "duplicate detected at promotion");
                    stagingRepo.save(s);
                    continue;
                }

                VoterRegistration v = new VoterRegistration();
                // allow DB/JPA to generate internal voterId
                v.setVoterCardId(null); // NEC may set later
                v.setLookupHash(lookup);

                v.setEncryptedFullName(s.getFullName() == null ? null : s.getFullName().getBytes(StandardCharsets.UTF_8));
                v.setEncryptedNationalId(s.getNationalId() == null ? null : s.getNationalId().getBytes(StandardCharsets.UTF_8));
                v.setEncryptedDob(s.getDob() == null ? null : s.getDob().toString().getBytes(StandardCharsets.UTF_8));

                // resolve center code -> assignedCenterId and populate district/county via existing helper
                if (s.getAssignedCenterCode() != null && !s.getAssignedCenterCode().isBlank()) {
                    Optional<PollingCenter> pcOpt = centerRepo.findByCodeIgnoreCase(s.getAssignedCenterCode());
                    if (pcOpt.isPresent()) {
                        PollingCenter pc = pcOpt.get();
                        v.setAssignedCenterId(pc.getCenterId());
                        if (pc.getDistrict() != null) {
                            v.setDistrictId(pc.getDistrict().getDistrictId());
                            if (pc.getDistrict().getCounty() != null) {
                                v.setCountyId(pc.getDistrict().getCounty().getCountyId());
                            }
                        }
                        v.setPollingPlace(pc.getCenterName());
                    } else {
                        // center not found (should have failed validation earlier)
                        v.setAssignedCenterId(null);
                    }
                }

                v.setElectionId(null); // batch promote not tied to a specific election unless staging had info
                v.setGeoLat(null);
                v.setGeoLon(null);
                v.setPictureUrl(null);
                if (actor != null) {
                    v.setRegisteredBy(actor);
                    v.setOrg(actor.getDefaultOrg());
                }
                v.setRegistrationSource("BULK_IMPORT");
                v.setEffectiveFrom(null);
                v.setEffectiveTo(null);
                v.setRegistrationStatus("REGISTERED");

                // Persist the new voter registration
                VoterRegistration saved = voterRepo.save(v);

                // mark staging processed and link processed_voter_id
                s.setProcessed(true);
                s.setProcessedAt(LocalDateTime.now());
                s.setProcessedBy(actor);
                s.setProcessedVoterId(saved.getVoterId());
                s.setValidationErrors(null);

                stagingRepo.save(s);
                promoted++;

            } catch (Exception ex) {
                // mark error on staging row
                s.setProcessed(false);
                String prev = s.getValidationErrors() == null ? "" : s.getValidationErrors() + "; ";
                s.setValidationErrors(prev + "promotion error: " + ex.getMessage());
                stagingRepo.save(s);
            }
        }

        // audit
        try {
            auditLogService.logCreate(null, actorUserId, "VoterRegistration",
                    "Promoted staging batch=" + (batchId != null ? batchId : "ALL") + " rows_promoted=" + promoted);
        } catch (Exception ex) {
            // best-effort
        }

        return promoted;
    }
}