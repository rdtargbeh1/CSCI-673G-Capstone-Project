package election.ems_backend.mapper;

import election.ems_backend.dto.ChatMessageCreateRequest;
import election.ems_backend.dto.ChatMessageDto;
import election.ems_backend.entity.ChatMessage;
import election.ems_backend.entity.ChatRoom;
import election.ems_backend.entity.Organization;
import election.ems_backend.entity.SystemUser;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Optional;

@Component
public class ChatMessageMapper {


    public ChatMessageDto toDTO(ChatMessage m) {
        if (m == null) return null;
        String f = Optional.ofNullable(m.getSender().getFirstName()).orElse("");
        String l = Optional.ofNullable(m.getSender().getLastName()).orElse("");
        String senderName = (f + " " + l).trim();

        return ChatMessageDto.builder()
                .messageId(m.getMessageId())
                .roomId(m.getRoom().getRoomId())
                .senderId(m.getSender().getUserId())
                .senderName(senderName)
                .contentType(m.getContentType())
                .content(m.getContent())
                .metadata(m.getMetadata())
                .replyTo(m.getReplyTo() != null ? m.getReplyTo().getMessageId() : null)
                .dateCreated(m.getDateCreated())
                .dateEdited(m.getDateEdited())
                .build();
    }

    public ChatMessage toEntity(ChatMessageCreateRequest req,
                                Organization org,
                                ChatRoom room,
                                SystemUser sender,
                                ChatMessage replyTo) {
        ChatMessage m = new ChatMessage();
        m.setOrganization(org);
        m.setRoom(room);
        m.setSender(sender);
        m.setClientGuid(req.getClientGuid());
        m.setContentType((req.getContentType() == null || req.getContentType().isBlank()) ? "TEXT" : req.getContentType());
        m.setContent(req.getContent());
        m.setMetadata(req.getMetadata() != null ? req.getMetadata() : new HashMap<>());
        m.setReplyTo(replyTo);
        return m;
    }


}