package election.ems_backend.mapper;

import election.ems_backend.dto.UserSessionCreateRequest;
import election.ems_backend.dto.UserSessionDto;
import election.ems_backend.entity.Organization;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.entity.UserSession;
import org.springframework.stereotype.Component;

@Component
public class UserSessionMapper {

    public UserSession toEntity(UserSessionCreateRequest req, SystemUser user, Organization org) {
        UserSession s = new UserSession();
        s.setUser(user);
        s.setOrganization(org);
        s.setExpiresDate(req.getExpiresDate());
        return s;
    }

    public UserSessionDto toDTO(UserSession s) {
        return UserSessionDto.builder()
                .sessionId(s.getSessionId())
                .userId(s.getUser().getUserId())
                .orgId(s.getOrganization() != null ? s.getOrganization().getOrgId() : null)
                .dateCreated(s.getDateCreated())
                .expiresDate(s.getExpiresDate())
                .revoked(s.isRevoked())
                .build();
    }
}
