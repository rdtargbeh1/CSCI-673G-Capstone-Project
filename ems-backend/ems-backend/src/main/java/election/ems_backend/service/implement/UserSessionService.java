package election.ems_backend.service.implement;


import election.ems_backend.dto.UserSessionCreateRequest;
import election.ems_backend.dto.UserSessionDto;
import election.ems_backend.entity.Organization;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.entity.UserSession;
import election.ems_backend.mapper.UserSessionMapper;
import election.ems_backend.repository.OrganizationRepository;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.repository.UserSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class UserSessionService {

    private final UserSessionRepository repo;
    private final SystemUserRepository userRepo;
    private final OrganizationRepository orgRepo;
    private final UserSessionMapper mapper = new UserSessionMapper();

    public UserSessionDto create(UserSessionCreateRequest req) {
        SystemUser user = userRepo.findById(req.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        Organization org = req.getOrgId() != null
                ? orgRepo.findById(req.getOrgId()).orElse(null)
                : null;

        UserSession s = mapper.toEntity(req, user, org);
        s.setDateCreated(LocalDateTime.now());
        return mapper.toDTO(repo.save(s));
    }

    @Transactional(readOnly = true)
    public List<UserSessionDto> getUserSessions(UUID userId) {
        return repo.findByUser_UserId(userId)
                .stream().map(mapper::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<UserSessionDto> getActiveSessions(UUID userId) {
        return repo.findActiveSessions(userId)
                .stream().map(mapper::toDTO).toList();
    }

    public void revoke(UUID sessionId) {
        repo.revokeById(sessionId);
    }

    public void revokeAll(UUID userId) {
        repo.revokeAllByUserId(userId);
    }
}
