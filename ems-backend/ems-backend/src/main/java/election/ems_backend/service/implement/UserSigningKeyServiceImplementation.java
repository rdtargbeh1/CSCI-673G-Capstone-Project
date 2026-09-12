package election.ems_backend.service.implement;

import election.ems_backend.dto.UserSigningKeyCreateRequest;
import election.ems_backend.dto.UserSigningKeyDto;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.entity.UserSigningKey;
import election.ems_backend.mapper.UserSigningKeyMapper;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.repository.UserSigningKeyRepository;
import election.ems_backend.service.AuditLogService;
import election.ems_backend.service.UserSigningKeyService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
@Transactional
public class UserSigningKeyServiceImplementation implements UserSigningKeyService {

    private static final Logger log = LoggerFactory.getLogger(UserSigningKeyServiceImplementation.class);

    private final UserSigningKeyRepository repo;
    private final SystemUserRepository userRepo;
    private final UserSigningKeyMapper mapper;
    private final AuditLogService auditLogService;

    @Override
    public UserSigningKeyDto createForUser(UUID userId, UserSigningKeyCreateRequest req) {
        SystemUser user = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));

        if (req.getPublicKey() == null || req.getPublicKey().isBlank()) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "publicKey is required");
        }

        UserSigningKey k = new UserSigningKey();
        k.setUser(user);
        k.setKid(req.getKid());
        k.setPublicKey(req.getPublicKey());
        k.setAlgorithm(req.getAlgorithm());
        k.setMetadata(req.getMetadata());
        UserSigningKey saved = repo.save(k);

        // Audit: record key creation (do not fail the main flow if audit logging fails)
        try {
            UUID orgId = (user.getDefaultOrg() != null) ? user.getDefaultOrg().getOrgId() : null;
            auditLogService.logCreate(orgId, user.getUserId(), "UserSigningKey",
                    "Created signing key kid=" + saved.getKid() + " keyId=" + saved.getKeyId());
        } catch (Exception ex) {
            log.warn("Failed to write audit log for signing key create: {}", ex.getMessage(), ex);
        }

        return mapper.toDto(saved);
    }



    @Override
    @Transactional(readOnly = true)
    public List<UserSigningKeyDto> listForUser(UUID userId) {
        return repo.findByUser_UserIdOrderByDateCreatedDesc(userId)
                .stream()
                .map(mapper::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public UserSigningKeyDto getById(UUID keyId) {
        return repo.findById(keyId).map(mapper::toDto)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Signing key not found"));
    }

    @Override
    public UserSigningKeyDto revoke(UUID keyId) {
        UserSigningKey key = repo.findById(keyId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Signing key not found"));
        if (!key.isRevoked()) {
            key.setRevoked(true);
            key.setDateCreated(LocalDateTime.now()); // mark revocation time
            key = repo.save(key);

            // Audit: record key revocation
            try {
                UUID orgId = (key.getUser() != null && key.getUser().getDefaultOrg() != null)
                        ? key.getUser().getDefaultOrg().getOrgId()
                        : null;
                UUID actorUserId = (key.getUser() != null) ? key.getUser().getUserId() : null;
                auditLogService.logUpdate(orgId, actorUserId, "UserSigningKey",
                        "Revoked signing key kid=" + key.getKid() + " keyId=" + key.getKeyId());
            } catch (Exception ex) {
                log.warn("Failed to write audit log for signing key revoke: {}", ex.getMessage(), ex);
            }
        }
        return mapper.toDto(key);
    }


}
