package election.ems_backend.controller;

import election.ems_backend.dto.ChatRoomCreateRequest;
import election.ems_backend.dto.ChatRoomDto;
import election.ems_backend.dto.ChatRoomUpdateRequest;
import election.ems_backend.entity.Organization;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.service.ChatRoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/chat/rooms")
@RequiredArgsConstructor
public class ChatRoomController {

    private final ChatRoomService service;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ChatRoomDto create(@RequestAttribute("org") Organization org,
                              @AuthenticationPrincipal SystemUser me,
                              @Valid @RequestBody ChatRoomCreateRequest req) {
        return service.create(org, me, req);
    }

    @GetMapping("/{roomId}")
    public ChatRoomDto get(@RequestAttribute("org") Organization org,
                           @PathVariable UUID roomId) {
        return service.get(org, roomId);
    }

    @GetMapping
    public Page<ChatRoomDto> search(@RequestAttribute("org") Organization org,
                                    @RequestParam(required = false) String q,
                                    @RequestParam(defaultValue = "false") boolean includeArchived,
                                    @PageableDefault(size = 20) Pageable pageable) {
        return service.search(org, q, includeArchived, pageable);
    }

    @PutMapping("/{roomId}")
    public ChatRoomDto update(@RequestAttribute("org") Organization org,
                              @PathVariable UUID roomId,
                              @Valid @RequestBody ChatRoomUpdateRequest req) {
        return service.update(org, roomId, req);
    }

    @PostMapping("/{roomId}/archive")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archive(@RequestAttribute("org") Organization org,
                        @PathVariable UUID roomId,
                        @RequestParam boolean archived) {
        service.archive(org, roomId, archived);
    }
}