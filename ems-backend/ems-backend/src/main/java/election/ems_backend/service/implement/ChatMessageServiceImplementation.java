package election.ems_backend.service.implement;


import election.ems_backend.dto.ChatMessageCreateRequest;
import election.ems_backend.dto.ChatMessageDto;
import election.ems_backend.entity.ChatMessage;
import election.ems_backend.entity.ChatRoom;
import election.ems_backend.entity.Organization;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.mapper.ChatMessageMapper;
import election.ems_backend.repository.ChatMessageRepository;
import election.ems_backend.repository.ChatRoomRepository;
import election.ems_backend.repository.OrganizationRepository;
import election.ems_backend.service.ChatMessageService;
import election.ems_backend.service.NotificationService;
import election.ems_backend.utility.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ChatMessageServiceImplementation implements ChatMessageService {

    private final ChatMessageRepository chatMessageRepository;
    private final NotificationService notificationService;
    private final ChatRoomRepository rooms;
    private final OrganizationRepository organizations;

    private final ChatMessageMapper mapper = new ChatMessageMapper();
    private final ApplicationEventPublisher events;


    @Override
    public ChatMessageDto sendInTenant(ChatMessageCreateRequest req) {
        if (req == null) throw new IllegalArgumentException("Request is required");

        Organization org = requireOrg();
        SystemUser sender = requirePrincipal();

        ChatRoom room = rooms.findInOrg(org.getOrgId(), req.getRoomId())
                .orElseThrow(() -> new NoSuchElementException("Room not found"));

        // Idempotency
        if (req.getClientGuid() != null) {
            var existing = chatMessageRepository.findByClientGuid(req.getClientGuid());
            if (existing.isPresent()) {
                return mapper.toDTO(existing.get());
            }
        }

        ChatMessage parent = null;
        if (req.getReplyTo() != null) {
            parent = chatMessageRepository.findById(req.getReplyTo())
                    .orElseThrow(() -> new NoSuchElementException("replyTo message not found"));
            if (!parent.getRoom().getRoomId().equals(room.getRoomId())) {
                throw new IllegalArgumentException("replyTo must be in the same room");
            }
        }

        ChatMessage entity = mapper.toEntity(req, org, room, sender, parent);
        validateContent(entity.getContent(), entity.getContentType());

        ChatMessage saved = chatMessageRepository.save(entity);

        String roomDisplayName = (room.getName() == null || room.getName().isBlank())
                ? "Direct Message" : room.getName();

        // ✅ CREATE EVENT

        events.publishEvent(new ChatMessageCreatedEvent(
                room.getRoomId(),
                saved.getMessageId(),
                sender.getUserId(),
                org.getOrgId(),
                roomDisplayName,
                java.time.Instant.now()
        ));

        return mapper.toDTO(saved);
    }

    // ===================== EDIT =====================

    @Override
    public ChatMessageDto editInTenant(UUID messageId, ChatMessageEditRequest req) {
        if (req == null) throw new IllegalArgumentException("Request is required");

        Organization org = requireOrg();
        SystemUser me = requirePrincipal();

        ChatMessage m = chatMessageRepository.fetchWithSender(messageId)
                .orElseThrow(() -> new NoSuchElementException("Message not found"));

        enforceOwnership(m, org, me);

        validateContent(req.getContent(), m.getContentType());
        m.setContent(req.getContent());
        m.setDateEdited(LocalDateTime.now());

        // ✅ EDIT EVENT
        events.publishEvent(new ChatMessageEditedEvent(
                m.getRoom().getRoomId(),
                m.getMessageId(),
                me.getUserId(),
                org.getOrgId(),
                m.getRoom().getName(),
                java.time.Instant.now()
        ));

        return mapper.toDTO(m);
    }


    // ===================== DELETE =====================

    @Override
    public void deleteInTenant(UUID messageId) {
        Organization org = requireOrg();
        SystemUser me = requirePrincipal();

        ChatMessage m = chatMessageRepository.fetchWithSender(messageId)
                .orElseThrow(() -> new NoSuchElementException("Message not found"));

        enforceOwnership(m, org, me);

        m.setDateDeleted(LocalDateTime.now());

        // ✅ DELETE EVENT
        events.publishEvent(new ChatMessageDeletedEvent(
                m.getRoom().getRoomId(),
                m.getMessageId(),
                me.getUserId(),
                org.getOrgId(),
                m.getRoom().getName(),
                java.time.Instant.now()
        ));
    }

    // ===================== READ =====================

    @Transactional(readOnly = true)
    @Override
    public Page<ChatMessageDto> listInTenant(UUID roomId, Pageable pageable) {
        Organization org = requireOrg();
        ChatRoom room = rooms.findInOrg(org.getOrgId(), roomId)
                .orElseThrow(() -> new NoSuchElementException("Room not found"));

        return chatMessageRepository.findRecent(room.getRoomId(), pageable).map(mapper::toDTO);
    }


    @Transactional(readOnly = true)
    @Override
    public List<ChatMessageDto> syncSinceInTenant(UUID roomId, LocalDateTime since) {
        Organization org = requireOrg();
        ChatRoom room = rooms.findInOrg(org.getOrgId(), roomId)
                .orElseThrow(() -> new NoSuchElementException("Room not found"));
        return chatMessageRepository.findSince(room.getRoomId(), since).stream()
                .map(mapper::toDTO)
                .toList();
    }


    // ===================== HELPERS =====================

    private void enforceOwnership(ChatMessage m, Organization org, SystemUser me) {
        if (!m.getOrganization().getOrgId().equals(org.getOrgId())) {
            throw new SecurityException("Cross-tenant access forbidden");
        }
        if (!m.getSender().getUserId().equals(me.getUserId())) {
            throw new SecurityException("Only the sender can modify this message");
        }
    }

    private void validateContent(String content, String type) {
        if (content != null && content.length() > 4000) {
            throw new IllegalArgumentException("Message too long (max 4000 chars)");
        }
        if (type == null || type.isBlank()) {
            throw new IllegalArgumentException("contentType is required");
        }
    }

    private Organization requireOrg() {
        UUID orgId = TenantUtils.requireTenantOrg();
        return organizations.findById(orgId)
                .orElseThrow(() -> new NoSuchElementException("Organization not found"));
    }

    private SystemUser requirePrincipal() {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof SystemUser me)) {
            throw new IllegalStateException("Authenticated user required");
        }
        return (SystemUser) auth.getPrincipal();
    }



}
