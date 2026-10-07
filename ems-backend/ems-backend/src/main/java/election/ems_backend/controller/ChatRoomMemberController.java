package election.ems_backend.controller;

import election.ems_backend.dto.ChatRoomMemberAddRequest;
import election.ems_backend.dto.ChatRoomMemberDto;
import election.ems_backend.service.ChatRoomMemberService;
import election.ems_backend.utility.ChatRoomMemberMuteRequest;
import election.ems_backend.utility.ChatRoomMemberRoleRequest;
import election.ems_backend.utility.ChatRoomMemberSeenRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat/rooms/{roomId}/members")
@RequiredArgsConstructor
public class ChatRoomMemberController {

    private final ChatRoomMemberService service;



    @GetMapping
    public org.springframework.data.domain.Page<ChatRoomMemberDto> list(
            @PathVariable UUID roomId,
            @PageableDefault(size = 30) Pageable pageable) {
        return service.listInTenant(roomId, pageable);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ChatRoomMemberDto add(@PathVariable UUID roomId,
                                 @Valid @RequestBody ChatRoomMemberAddRequest req) {
        return service.addInTenant(roomId, req);
    }

    @DeleteMapping("/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable UUID roomId, @PathVariable UUID userId) {
        service.removeInTenant(roomId, userId);
    }

    @PutMapping("/{userId}/role")
    public ChatRoomMemberDto setRole(@PathVariable UUID roomId, @PathVariable UUID userId,
                                     @Valid @RequestBody ChatRoomMemberRoleRequest req) {
        return service.setRoleInTenant(roomId, userId, req);
    }

    @PutMapping("/{userId}/mute")
    public ChatRoomMemberDto setMuted(@PathVariable UUID roomId, @PathVariable UUID userId,
                                      @Valid @RequestBody ChatRoomMemberMuteRequest req) {
        return service.setMutedInTenant(roomId, userId, req);
    }

    @PostMapping("/{userId}/seen")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markSeen(@PathVariable UUID roomId, @PathVariable UUID userId,
                         @Valid @RequestBody ChatRoomMemberSeenRequest req) {
        service.markSeenInTenant(roomId, userId, req);
    }

    // Controller

    @GetMapping("/{userId}/unread")
    public Map<String, Long> unread(@PathVariable("roomId") UUID roomId,
                                    @PathVariable("userId") UUID userId) {
        long count = service.unreadCountInTenant(roomId, userId);
        return Map.of("unread", count);
    }



}
