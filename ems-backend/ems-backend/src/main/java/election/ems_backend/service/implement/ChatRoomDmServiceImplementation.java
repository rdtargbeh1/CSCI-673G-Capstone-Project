package election.ems_backend.service.implement;

import election.ems_backend.dto.ChatRoomDmDto;
import election.ems_backend.entity.*;
import election.ems_backend.enums.ChatMemberRole;
import election.ems_backend.enums.RoomType;
import election.ems_backend.mapper.ChatRoomDmMapper;
import election.ems_backend.repository.*;
import election.ems_backend.service.ChatRoomDmService;
import election.ems_backend.utility.TenantUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class ChatRoomDmServiceImplementation implements ChatRoomDmService {

    private final ChatRoomDmRepository dmRepo;
    private final ChatRoomRepository roomRepo;
    private final ChatRoomMemberRepository chatRoomMemberRepository;
    private final OrganizationRepository orgRepo;
    private final SystemUserRepository userRepo;

    private final ChatRoomDmMapper mapper = new ChatRoomDmMapper();

    @Override
    public ChatRoomDmDto openOrGet(UUID otherUserId) {
        UUID orgId = TenantUtils.requireTenantOrg();
        Organization org = orgRepo.findById(orgId)
                .orElseThrow(() -> new NoSuchElementException("Organization not found"));

        SystemUser me = currentUserOrThrow();
        if (otherUserId == null || otherUserId.equals(me.getUserId()))
            throw new IllegalArgumentException("Invalid otherUserId");

        SystemUser other = userRepo.findById(otherUserId)
                .orElseThrow(() -> new NoSuchElementException("User not found"));

        // Canonical order by UUID text to match @PrePersist in entity
        UUID a = me.getUserId();
        UUID b = other.getUserId();
        boolean meIsFirst = a.toString().compareTo(b.toString()) <= 0;

        UUID u1 = meIsFirst ? a : b;
        UUID u2 = meIsFirst ? b : a;

        // 1) lookup existing
        Optional<ChatRoomDm> existing = dmRepo
                .findByOrganization_OrgIdAndUser1_UserIdAndUser2_UserId(orgId, u1, u2);
        if (existing.isPresent()) return mapper.toDTO(existing.get());

        // 2) create ChatRoom (DM)
        ChatRoom room = new ChatRoom();
        room.setRoomId(UUID.randomUUID());
        room.setOrganization(org);
        room.setRoomType(RoomType.DM);
        room.setName(null);
        room.setDescription(null);
        room.setCreatedBy(me);
        room.setDateCreated(LocalDateTime.now(ZoneOffset.UTC));
        room.setArchived(false);
        room.setSettings(new HashMap<>()); // e.g., slowmode_sec
        ChatRoom savedRoom = roomRepo.save(room);

        // 3) create DM row (MapsId will copy roomId)
        ChatRoomDm dm = new ChatRoomDm();
        dm.setRoom(savedRoom);
        dm.setOrganization(org);
        dm.setUser1(meIsFirst ? me : other);
        dm.setUser2(meIsFirst ? other : me);
        ChatRoomDm savedDm = dmRepo.save(dm);

        // 4) ensure members for both users
        ensureMember(savedRoom, me, ChatMemberRole.MEMBER);
        ensureMember(savedRoom, other, ChatMemberRole.MEMBER);

        return mapper.toDTO(savedDm);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatRoomDmDto> myDms() {
        UUID orgId = TenantUtils.requireTenantOrg();
        SystemUser me = currentUserOrThrow();

        List<ChatRoomDm> asUser1 = dmRepo.findByOrganization_OrgIdAndUser1_UserId(orgId, me.getUserId());
        List<ChatRoomDm> asUser2 = dmRepo.findByOrganization_OrgIdAndUser2_UserId(orgId, me.getUserId());

        // merge & dedupe by roomId
        Map<UUID, ChatRoomDm> map = new LinkedHashMap<>();
        for (ChatRoomDm dm : asUser1) map.putIfAbsent(dm.getRoomId(), dm);
        for (ChatRoomDm dm : asUser2) map.putIfAbsent(dm.getRoomId(), dm);

        return map.values().stream().map(mapper::toDTO).toList();
    }

    /* ---------- helpers ---------- */

    private SystemUser currentUserOrThrow() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof SystemUser))
            throw new IllegalStateException("Authenticated user required");
        return (SystemUser) auth.getPrincipal();
    }

    private void ensureMember(ChatRoom room, SystemUser user, ChatMemberRole role) {
        boolean exists = chatRoomMemberRepository.existsByRoom_RoomIdAndUser_UserId(room.getRoomId(), user.getUserId());
        if (exists) return;

        ChatRoomMember m = new ChatRoomMember();
        m.setRoom(room);
        m.setOrganization(room.getOrganization());
        m.setUser(user);
        m.setRoleName(role);
        m.setJoinedAt(LocalDateTime.now(ZoneOffset.UTC));
        m.setMuted(false);
        m.setEnabled(true);
        chatRoomMemberRepository.save(m);
    }
}
