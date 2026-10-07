package election.ems_backend.mapper;

import election.ems_backend.dto.OrgMembershipDto;
import election.ems_backend.entity.OrgMembership;
import election.ems_backend.entity.SystemUser;
import org.springframework.stereotype.Component;

@Component
public class OrgMembershipMapper {

    public OrgMembershipDto toDTO(OrgMembership m) {
        if (m == null) return null;

        OrgMembershipDto dto = new OrgMembershipDto();
        dto.setMembershipId(m.getMembershipId());
        dto.setOrgId(m.getOrganization() != null ? m.getOrganization().getOrgId() : null);
        dto.setOrgName(m.getOrganization().getOrgName());
        dto.setUserId(m.getUser() != null ? m.getUser().getUserId() : null);
        dto.setRoleName(m.getRoleName());
        dto.setEnabled(m.isEnabled());
        dto.setDateCreated(m.getDateCreated());

        // ✅ include user info for display (avoid NPE)
        SystemUser u = m.getUser();
        if (u != null) {
            dto.setFirstName(u.getFirstName());
            dto.setLastName(u.getLastName());
            dto.setUserName(u.getUserName());
            dto.setEmail(u.getEmail());

            String fn = u.getFirstName() == null ? "" : u.getFirstName().trim();
            String ln = u.getLastName() == null ? "" : u.getLastName().trim();
            String full = (fn + " " + ln).trim();
            dto.setFullName(full.isEmpty() ? null : full);
        }

        return dto;
    }
}