package election.ems_backend.service.implement;


import election.ems_backend.dto.VoterRegistrationCreateRequest;
import election.ems_backend.dto.VoterRegistrationDto;
import election.ems_backend.entity.PollingCenter;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.entity.VoterRegistration;
import election.ems_backend.mapper.VoterRegistrationMapper;
import election.ems_backend.repository.PollingCenterRepository;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.repository.VoterRegistrationRepository;
import election.ems_backend.service.AuditLogService;
import election.ems_backend.service.VoterRegistrationService;
import election.ems_backend.utility.HmacUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
@Transactional
public class VoterRegistrationServiceImplementation implements VoterRegistrationService {

    private final VoterRegistrationRepository repo;
    private final PollingCenterRepository centerRepo;
    private final SystemUserRepository userRepo;
    private final AuditLogService auditLogService;
    private final VoterRegistrationMapper mapper = new VoterRegistrationMapper();

    @Value("${app.secrets.lookup-hmac-key:default-insecure-key-do-not-use}")
    private String lookupHmacKey;


    @Override
    public VoterRegistrationDto create(VoterRegistrationCreateRequest req) {
        if (req == null || req.getNationalId() == null || req.getNationalId().isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "nationalId is required");
        }

        UUID voterId = req.getVoterId() != null ? req.getVoterId() : UUID.randomUUID();
        String lookupHash = HmacUtils.hmacSha256Hex(req.getNationalId(), lookupHmacKey);

        if (repo.findByLookupHash(lookupHash).isPresent()) {
            throw new ResponseStatusException(CONFLICT, "A voter with the same national identifier already exists");
        }

        VoterRegistration v = new VoterRegistration();
        v.setVoterId(voterId);
        v.setVoterCardId(req.getVoterCardId());
        v.setLookupHash(lookupHash);

        // placeholder encryption: convert to bytes. Replace with real encryption/KMS prior to production.
        v.setEncryptedFullName(req.getFullName() == null ? null : req.getFullName().getBytes(StandardCharsets.UTF_8));
        v.setEncryptedNationalId(req.getNationalId().getBytes(StandardCharsets.UTF_8));
        v.setEncryptedDob(req.getDob() == null ? null : req.getDob().getBytes(StandardCharsets.UTF_8));

        // set assignment and geo
        if (req.getAssignedCenterId() != null) {
            populateCenterFields(v, req.getAssignedCenterId());
            v.setAssignedCenterId(req.getAssignedCenterId());
        } else {
            v.setAssignedCenterId(null);
        }
        v.setPollingPlace(req.getPollingPlace());
        v.setElectionId(req.getElectionId());
        v.setGeoLat(req.getGeoLat());
        v.setGeoLon(req.getGeoLon());
        v.setRegistrationSource(req.getRegistrationSource());
        v.setEffectiveFrom(req.getEffectiveFrom() == null ? null : LocalDateTime.parse(req.getEffectiveFrom()));
        v.setEffectiveTo(req.getEffectiveTo() == null ? null : LocalDateTime.parse(req.getEffectiveTo()));
        v.setRegistrationStatus("REGISTERED");

        if (req.getRegisteredBy() != null) {
            SystemUser actor = userRepo.findById(req.getRegisteredBy())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Registering user not found"));
            v.setRegisteredBy(actor);
        }

        VoterRegistration saved = repo.save(v);

        // audit (best-effort)
        try {
            UUID orgId = (saved.getRegisteredBy() != null && saved.getRegisteredBy().getDefaultOrg() != null)
                    ? saved.getRegisteredBy().getDefaultOrg().getOrgId()
                    : null;
            UUID actorUserId = saved.getRegisteredBy() != null ? saved.getRegisteredBy().getUserId() : null;
            auditLogService.logCreate(orgId, actorUserId, "VoterRegistration",
                    "Created voter registration voterId=" + saved.getVoterId() + " lookupHash=" + saved.getLookupHash());
        } catch (Exception ex) {
            // do not fail on audit errors
        }

        return mapper.toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public VoterRegistrationDto findByLookupHash(String lookupHash) {
        return repo.findByLookupHash(lookupHash).map(this::toDto)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Voter not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public VoterRegistrationDto getById(UUID voterId) {
        return repo.findById(voterId).map(this::toDto)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Voter not found"));
    }

    @Override
    public VoterRegistrationDto transferToCenter(UUID voterId, UUID newCenterId, UUID actorUserId) {
        VoterRegistration v = repo.findById(voterId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Voter not found"));
        populateCenterFields(v, newCenterId);
        v.setAssignedCenterId(newCenterId);

        // optionally set registeredBy to actor or keep original; we log actor separately
        if (actorUserId != null) {
            userRepo.findById(actorUserId).ifPresent(v::setRegisteredBy);
        }

        VoterRegistration saved = repo.save(v);

        try {
            UUID orgId = (actorUserId != null) ? userRepo.findById(actorUserId)
                    .map(u -> u.getDefaultOrg() != null ? u.getDefaultOrg().getOrgId() : null).orElse(null) : null;
            auditLogService.logUpdate(orgId, actorUserId, "VoterRegistration",
                    "Transferred voterId=" + saved.getVoterId() + " to center=" + newCenterId);
        } catch (Exception ex) {
            // noop
        }

        return toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<VoterRegistrationDto> listByCenter(UUID centerId) {
        return repo.findByAssignedCenterId(centerId).stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<VoterRegistrationDto> listByDistrict(UUID districtId) {
        return repo.findByDistrictId(districtId).stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<VoterRegistrationDto> listByCounty(UUID countyId) {
        return repo.findByCountyId(countyId).stream().map(this::toDto).collect(Collectors.toList());
    }

    @Override
    public VoterRegistrationDto assignToElection(UUID voterId, UUID electionId, UUID actorUserId) {
        VoterRegistration v = repo.findById(voterId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Voter not found"));
        v.setElectionId(electionId);
        if (actorUserId != null) {
            userRepo.findById(actorUserId).ifPresent(v::setRegisteredBy);
        }
        VoterRegistration saved = repo.save(v);

        try {
            UUID orgId = (actorUserId != null) ? userRepo.findById(actorUserId)
                    .map(u -> u.getDefaultOrg() != null ? u.getDefaultOrg().getOrgId() : null).orElse(null) : null;
            auditLogService.logUpdate(orgId, actorUserId, "VoterRegistration",
                    "Assigned voterId=" + saved.getVoterId() + " to election=" + electionId);
        } catch (Exception ex) {
            // noop
        }

        return toDto(saved);
    }

    // --- helpers ---
    private void populateCenterFields(VoterRegistration v, UUID centerId) {
        if (centerId == null) return;
        PollingCenter pc = centerRepo.findById(centerId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Polling center not found"));
        v.setAssignedCenterId(pc.getCenterId());
        if (pc.getDistrict() != null) {
            v.setDistrictId(pc.getDistrict().getDistrictId());
            if (pc.getDistrict().getCounty() != null) {
                v.setCountyId(pc.getDistrict().getCounty().getCountyId());
            }
        }
        // polling place code/name (if center has code/name)
        v.setPollingPlace(pc.getCenterName());
    }

    private VoterRegistrationDto toDto(VoterRegistration v) {
        return mapper.toDto(v);
    }
}