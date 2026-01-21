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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditLogServiceImplementation implements AuditLogService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AuditLogServiceImplementation.class);

    private final AuditLogRepository auditLogRepository;
    private final OrganizationRepository orgRepo;
    private final SystemUserRepository userRepo;

    private final AuditLedgerService auditLedgerService;
    private final AuditLedgerRetryService auditLedgerRetryService;

    private final AuditLogMapper mapper = new AuditLogMapper();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public AuditLogDto log(UUID orgId,
                           UUID userId,
                           ActivityType type,
                           String entity,
                           String description) {
        try {
            // Resolve references if possible; NEVER throw if missing
            Organization org = (orgId == null) ? null : orgRepo.findById(orgId).orElse(null);
            SystemUser user = (userId == null) ? null : userRepo.findById(userId).orElse(null);

            AuditLog a = new AuditLog();
            a.setOrganization(org); // can be null
            a.setUser(user);        // can be null
            a.setActivityType(type != null ? type : ActivityType.OTHER);
            a.setEntityAffected(entity);
            a.setActionDescription(description);

            AuditLog saved = auditLogRepository.save(a);

            // Build compact ledger payload (best-effort)
            Map<String, Object> payload = new HashMap<>();
            payload.put("logId", saved.getLogId());
            payload.put("orgId", orgId);
            payload.put("userId", userId);
            payload.put("activityType", saved.getActivityType() != null ? saved.getActivityType().name() : null);
            payload.put("entityAffected", saved.getEntityAffected());
            payload.put("actionDescription", saved.getActionDescription());
            payload.put("metadataHash", HashUtil.sha256Hex(saved.getMetadata()));
            payload.put("dateCreated", saved.getDateCreated() != null ? saved.getDateCreated().toString() : null);

            String payloadJson;
            try {
                payloadJson = objectMapper.writeValueAsString(payload);
            } catch (Exception ex) {
                payloadJson = "logId=" + saved.getLogId();
            }

            // Ledger append MUST NOT break app
            try {
                auditLedgerService.appendEntry("audit_log", saved.getLogId(), payloadJson, userId, null);
            } catch (Exception ex) {
                LOGGER.warn("Audit ledger append failed (will enqueue retry): {}", ex.getMessage());
                try {
                    auditLedgerRetryService.enqueueRetry("audit_log", saved.getLogId(), payloadJson, userId, null, ex.getMessage());
                } catch (Exception inner) {
                    LOGGER.warn("Audit retry enqueue failed (ignored): {}", inner.getMessage());
                }
            }

            return mapper.toDTO(saved);
        } catch (Exception ex) {
            // absolute guarantee: audit never breaks caller flows
            LOGGER.warn("Audit log write failed (ignored): {}", ex.getMessage(), ex);
            return null;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLogDto> search(UUID orgId,
                                    UUID userId,
                                    ActivityType type,
                                    LocalDateTime from,
                                    LocalDateTime to,
                                    String q,
                                    Pageable pageable) {
        Specification<AuditLog> spec = Specification
                .where(AuditLogSpecs.orgEquals(orgId))
                .and(AuditLogSpecs.userEquals(userId))
                .and(AuditLogSpecs.typeEquals(type))
                .and(AuditLogSpecs.between(from, to))
                .and(AuditLogSpecs.textSearch(q));

        return auditLogRepository.findAll(spec, pageable).map(mapper::toDTO);
    }


}
