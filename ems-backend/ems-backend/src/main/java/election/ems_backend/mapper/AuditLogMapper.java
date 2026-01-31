package election.ems_backend.mapper;

import election.ems_backend.dto.AuditLogDto;
import election.ems_backend.entity.AuditLog;
import election.ems_backend.entity.Organization;
import election.ems_backend.entity.SystemUser;
import org.springframework.stereotype.Component;

@Component
public class AuditLogMapper {

    public AuditLogDto toDTO(AuditLog log){
        if (log == null) return null;

        String orgName = (log.getOrganization() != null ? log.getOrganization().getOrgName() : null);
        String userName = null;
        if (log.getUser() != null) {
            String first = log.getUser().getFirstName();
            String last = log.getUser().getLastName();
            first = first == null ? " " : first.trim();
            last = last == null ? " " : last.trim();

            String combined = (first + " " + last);
            userName = combined.isEmpty() ? null : combined;
        }

        return  AuditLogDto.builder()
                .logId(log.getLogId())
                .orgId(log.getOrganization() != null ? log.getOrganization().getOrgId() : null)
                .orgName(orgName)
                .userName(userName)
                .userId(log.getUser() != null ? log.getUser().getUserId() : null)
                .activityType(log.getActivityType())
                .entityAffected(log.getEntityAffected())
                .actionDescription(log.getActionDescription())
                .metadata(log.getMetadata())
                .dateCreated(log.getDateCreated())
                .build();

    }

}
