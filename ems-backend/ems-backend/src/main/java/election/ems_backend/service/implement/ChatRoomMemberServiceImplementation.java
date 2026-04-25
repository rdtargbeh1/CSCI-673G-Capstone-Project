package election.ems_backend.service.implement;


import election.ems_backend.dto.ChatMessageCreateRequest;
import election.ems_backend.dto.ChatMessageDto;
import election.ems_backend.dto.ChatRoomMemberAddRequest;
import election.ems_backend.dto.ChatRoomMemberDto;
import election.ems_backend.entity.*;
import election.ems_backend.mapper.ChatMessageMapper;
import election.ems_backend.mapper.ChatRoomMemberMapper;
import election.ems_backend.repository.*;
import election.ems_backend.service.ChatRoomMemberService;
import election.ems_backend.tenant.TenantUtils;
import election.ems_backend.utility.*;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.NoSuchElementException;
import java.util.UUID;


@Service
@RequiredArgsConstructor
@Transactional
public class ChatRoomMemberServiceImplementation implements ChatRoomMemberService {
    private final ChatRoomRepository rooms;
    private final ChatRoomMemberRepository members;
    private final SystemUserRepository users;
    private final OrganizationRepository orgs;
    private final ChatMessageRepository messages;
    private final ChatRoomMemberMapper mapper;
    private final OrganizationRepository organizations;

    private final ChatMessageMapper messageMapper = new ChatMessageMapper();
    private final ApplicationEventPublisher events;



    @Override
    public ChatMessageDto sendInTenant(ChatMessageCreateRequest req) {
        if (req == null) throw new IllegalArgumentException("Request is required");

        // 1) Resolve tenant + principal
        UUID orgId = TenantUtils.requireTenantOrg();
        Organization org = organizations.findById(orgId)
                .orElseThrow(() -> new NoSuchElementException("Organization not found"));

        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof SystemUser)) {
            throw new IllegalStateException("Authenticated user required");
        }
        SystemUser sender = (SystemUser) auth.getPrincipal();

        // 2) Resolve room within tenant
        ChatRoom room = rooms.findInOrg(org.getOrgId(), req.getRoomId())
                .orElseThrow(() -> new NoSuchElementException("Room not found"));

        // 3) Idempotency short-circuit
        if (req.getClientGuid() != null) {
            var existing = messages.findByClientGuid(req.getClientGuid());
            if (existing.isPresent()) return messageMapper.toDTO(existing.get());
        }

        // 4) (Optional) enforce slow-mode based on room.settings.slowmode_sec
        enforceSlowModeIfAny(room, sender.getUserId());

        // 5) Resolve replyTo (must be same room if provided)
        ChatMessage reply = null;
        if (req.getReplyTo() != null) {
            reply = messages.findById(req.getReplyTo())
                    .orElseThrow(() -> new NoSuchElementException("replyTo message not found"));
            if (!reply.getRoom().getRoomId().equals(room.getRoomId())) {
                throw new IllegalArgumentException("replyTo must be in the same room");
            }
        }

        // 6) Build + validate + save
        ChatMessage entity = messageMapper.toEntity(req, org, room, sender, reply);
        validateContent(entity.getContent(), entity.getContentType());
        ChatMessage saved = messages.save(entity);

        // 7) Update sender’s lastPostAt for slow-mode (cheap update)
        members.bumpByLastPostAt(room.getRoomId(), sender.getUserId(), saved.getDateCreated());

        // 8) Notify room members AFTER COMMIT via event
        String roomDisplay = (room.getName() == null || room.getName().isBlank())
                ? "Direct Message" : room.getName();

        events.publishEvent(new ChatMessageCreatedEvent(
                room.getRoomId(),
                saved.getMessageId(),
                sender.getUserId(),
                org.getOrgId(),
                roomDisplay,
                java.time.Instant.now()
        ));

        return messageMapper.toDTO(saved);
    }


    @Transactional(readOnly = true)
    public Page<ChatRoomMemberDto> listInTenant(UUID roomId, Pageable pageable) {
        Organization org = requireOrg();
        ChatRoom room = requireRoom(org, roomId);
        return members.findByRoom_RoomId(room.getRoomId(), pageable)
                .map(mapper::toDTO);
    }

    public ChatRoomMemberDto addInTenant(UUID roomId, ChatRoomMemberAddRequest req) {
        Organization org = requireOrg();
        ChatRoom room = requireRoom(org, roomId);
        SystemUser user = users.findById(req.getUserId())
                .orElseThrow(() -> new NoSuchElementException("User not found"));

        members.findByRoom_RoomIdAndUser_UserId(roomId, user.getUserId()).ifPresent(m -> {
            throw new IllegalArgumentException("User already in room");
        });

        ChatRoomMember m = new ChatRoomMember();
        m.setRoom(room);
        m.setOrganization(org);
        m.setUser(user);
        m.setRoleName(req.getRoleName());
        m.setEnabled(true);
        return mapper.toDTO(members.save(m));
    }

    public void removeInTenant(UUID roomId, UUID userId) {
        Organization org = requireOrg();
        requireRoom(org, roomId);
        ChatRoomMember m = members.findByRoom_RoomIdAndUser_UserId(roomId, userId)
                .orElseThrow(() -> new NoSuchElementException("Membership not found"));
        members.delete(m);
    }

    public ChatRoomMemberDto setRoleInTenant(UUID roomId, UUID userId, ChatRoomMemberRoleRequest req) {
        Organization org = requireOrg();
        requireRoom(org, roomId);
        ChatRoomMember m = members.findByRoom_RoomIdAndUser_UserId(roomId, userId)
                .orElseThrow(() -> new NoSuchElementException("Membership not found"));
        m.setRoleName(req.getRoleName());
        return mapper.toDTO(m);
    }

    public ChatRoomMemberDto setMutedInTenant(UUID roomId, UUID userId, ChatRoomMemberMuteRequest req) {
        Organization org = requireOrg();
        requireRoom(org, roomId);
        ChatRoomMember m = members.findByRoom_RoomIdAndUser_UserId(roomId, userId)
                .orElseThrow(() -> new NoSuchElementException("Membership not found"));
        m.setMuted(Boolean.TRUE.equals(req.getMuted()));
        return mapper.toDTO(m);
    }

    public void markSeenInTenant(UUID roomId, UUID userId, ChatRoomMemberSeenRequest req) {
        Organization org = requireOrg();
        requireRoom(org, roomId);
        var ts = req.getSeenAt();
        members.updateLastSeenAt(roomId, userId, ts);
        if (req.getLastSeenMessageId() != null) {
            var last = messages.findById(req.getLastSeenMessageId()).orElse(null);
            if (last != null) {
                members.findByRoom_RoomIdAndUser_UserId(roomId, userId).ifPresent(m -> {
                    m.setLastSeenMessage(last);
                    m.setLastSeenAt(ts);
                });
            }
        }
    }


    @Transactional(readOnly = true)
    public long unreadCountInTenant(UUID roomId, UUID userId) {
        var since = members.findByRoom_RoomIdAndUser_UserId(roomId, userId)
                .map(ChatRoomMember::getLastSeenAt)
                .orElse(LocalDateTime.of(1970, 1, 1, 0, 0)); // epoch fallback
        return messages.countUnreadSince(roomId, since);
    }

    private void enforceSlowModeIfAny(ChatRoom room, UUID senderUserId) {
        Object v = (room.getSettings() != null) ? room.getSettings().get("slowmode_sec") : null;
        if (!(v instanceof Number n)) return;
        int slow = n.intValue();
        if (slow <= 0) return;

        // Need the membership row to read lastPostAt
        var membership = members.findByRoom_RoomIdAndUser_UserId(room.getRoomId(), senderUserId).orElse(null);
        if (membership == null) return; // or throw if non-member cannot post

        var nowUtc = java.time.LocalDateTime.now(java.time.ZoneOffset.UTC);
        var cutoff = nowUtc.minusSeconds(slow);
        var lastPostAt = membership.getLastPostAt();
        if (lastPostAt != null && lastPostAt.isAfter(cutoff)) {
            long waitLeft = java.time.Duration.between(nowUtc, lastPostAt.plusSeconds(slow)).toSeconds();
            if (waitLeft < 0) waitLeft = 0;
            throw new IllegalStateException("Slow mode active. Please wait " + waitLeft + "s before posting again.");
        }
    }


    private void validateContent(String content, String type) {
        if (type == null || type.isBlank())
            throw new IllegalArgumentException("contentType is required");
        if (content != null && content.length() > 4000)
            throw new IllegalArgumentException("Message too long (max 4000 chars)");
    }


    private Organization requireOrg() {
        var orgId = TenantUtils.requireTenantOrg();   // uses your actual import above
        return orgs.findById(orgId)
                .orElseThrow(() -> new NoSuchElementException("Organization not found"));
    }

    private ChatRoom requireRoom(Organization org, UUID roomId) {
        return rooms.findInOrg(org.getOrgId(), roomId).orElseThrow(() -> new NoSuchElementException("Room not found"));
    }
}
