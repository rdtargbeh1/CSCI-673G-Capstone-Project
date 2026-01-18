package election.ems_backend.service.implement;

import com.fasterxml.jackson.databind.ObjectMapper;
import election.ems_backend.dto.AuditLogDto;
import election.ems_backend.entity.AuditLog;
import election.ems_backend.entity.Organization;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.enums.ActivityType;
import election.ems_backend.mapper.AuditLogMapper;
import election.ems_backend.repository.AuditLogRepository;
import election.ems_backend.repository.OrganizationRepository;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.service.AuditLedgerRetryService;
import election.ems_backend.service.AuditLedgerService;
import election.ems_backend.service.AuditLogService;
import election.ems_backend.utility.AuditLogSpecs;
import election.ems_backend.utility.HashUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AuditLogServiceImplementation implements AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final OrganizationRepository orgRepo;
    private final SystemUserRepository userRepo;
    private final AuditLogMapper mapper = new AuditLogMapper();

    private final AuditLedgerService auditLedgerService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AuditLedgerRetryService auditLedgerRetryService;


    @Override
    public AuditLogDto log(UUID orgId, UUID userId, ActivityType type, String entity, String description) {
        Organization org = orgRepo.findById(orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));
        SystemUser user = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        AuditLog a = new AuditLog();
        a.setOrganization(org);
        a.setUser(user);
        a.setActivityType(type != null ? type : ActivityType.OTHER);
        a.setEntityAffected(entity);
        a.setActionDescription(description);
        // timestamp set by @PrePersist

        AuditLog saved = auditLogRepository.save(a);

        // Build canonical payload for ledger append (compact and deterministic)
        Map<String, Object> payload = new HashMap<>();
        payload.put("logId", saved.getLogId());
        payload.put("orgId", saved.getOrganization() != null ? saved.getOrganization().getOrgId() : null);
        payload.put("userId", saved.getUser() != null ? saved.getUser().getUserId() : null);
        payload.put("activityType", saved.getActivityType() != null ? saved.getActivityType().name() : null);
        payload.put("entityAffected", saved.getEntityAffected());
        payload.put("actionDescription", saved.getActionDescription());
        // compute small fingerprint of metadata for inclusion rather than embedding possibly large JSON
        payload.put("metadataHash", HashUtil.sha256Hex(saved.getMetadata()));
        payload.put("dateCreated", saved.getDateCreated() != null ? saved.getDateCreated().toString() : null);

        String payloadJson;
        try {
            payloadJson = objectMapper.writeValueAsString(payload);
        } catch (Exception ex) {
            payloadJson = String.format("logId=%s; entity=%s", saved.getLogId(), saved.getEntityAffected());
        }

        // Attempt to append to audit ledger. If it fails, enqueue retry (best-effort) and return success.
        try {
            auditLedgerService.appendEntry("audit_log", saved.getLogId(), payloadJson,
                    saved.getUser() != null ? saved.getUser().getUserId() : null, null);
        } catch (Exception ex) {
            // Best-effort: enqueue for retry rather than failing the main operation
            try {
                auditLedgerRetryService.enqueueRetry("audit_log", saved.getLogId(), payloadJson,
                        saved.getUser() != null ? saved.getUser().getUserId() : null, null, ex.getMessage());
            } catch (Exception inner) {
                // If enqueue fails, log both errors — but still do not fail the caller.
                // Use server logs for operator troubleshooting.
                // (We intentionally do not throw to preserve availability.)
                // In environments that require stronger guarantee, change this behavior.
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Audit ledger append failed and retry enqueue also failed: " + inner.getMessage());
            }
        }

        return mapper.toDTO(saved);
    }


    @Override
    @Transactional(readOnly = true)
    public Page<AuditLogDto> search(UUID orgId, UUID userId, ActivityType type,
                                    LocalDateTime from, LocalDateTime to, String q, Pageable pageable) {
        Specification<AuditLog> spec = Specification
                .where(AuditLogSpecs.orgEquals(orgId))
                .and(AuditLogSpecs.userEquals(userId))
                .and(AuditLogSpecs.typeEquals(type))
                .and(AuditLogSpecs.between(from, to))
                .and(AuditLogSpecs.textSearch(q));

        return auditLogRepository.findAll(spec, pageable).map(mapper::toDTO);
    }


}
