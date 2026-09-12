package election.ems_backend.mapper;

import election.ems_backend.dto.ChatRoomCreateRequest;
import election.ems_backend.dto.ChatRoomDto;
import election.ems_backend.dto.ChatRoomUpdateRequest;
import election.ems_backend.entity.ChatRoom;
import election.ems_backend.entity.Organization;
import election.ems_backend.entity.SystemUser;
import org.springframework.stereotype.Component;

@Component
public class ChatRoomMapper {


    /** Convert Entity → DTO */
    public ChatRoomDto toDTO(ChatRoom r) {
        if (r == null) return null;

        String createdByFullName = null;
        if (r.getCreatedBy() != null) {
            String first = r.getCreatedBy().getFirstName() != null ? r.getCreatedBy().getFirstName() : "";
            String last = r.getCreatedBy().getLastName() != null ? r.getCreatedBy().getLastName() : "";
            createdByFullName = (first + " " + last).trim();
        }

        return ChatRoomDto.builder()
                .roomId(r.getRoomId())
                .name(r.getName())
                .description(r.getDescription())
                .roomType(r.getRoomType())
                .isArchived(r.isArchived())
                .orgId(r.getOrganization() != null ? r.getOrganization().getOrgId() : null)
                .orgName(r.getOrganization() != null ? r.getOrganization().getOrgName() : null)
                .createdById(r.getCreatedBy() != null ? r.getCreatedBy().getUserId() : null)
                .createdByFullName(createdByFullName)
                .dateCreated(r.getDateCreated())
                .settings(r.getSettings())
                .build();
    }

    /** Convert CreateRequest → Entity */
    public ChatRoom toEntity(ChatRoomCreateRequest req, Organization org, SystemUser creator) {
        if (req == null) return null;
        ChatRoom r = new ChatRoom();
        r.setOrganization(org);
        r.setCreatedBy(creator);
        r.setRoomType(req.getRoomType());
        r.setName(req.getName());
        r.setDescription(req.getDescription());
        r.setSettings(req.getSettings());
        return r;
    }

    /** Update existing entity from UpdateRequest */
    public void updateEntity(ChatRoom r, ChatRoomUpdateRequest req) {
        if (req == null || r == null) return;
        if (req.getName() != null) r.setName(req.getName());
        if (req.getDescription() != null) r.setDescription(req.getDescription());
        if (req.getIsArchived() != null) r.setArchived(req.getIsArchived());
        if (req.getSettings() != null) r.setSettings(req.getSettings());
    }

}
