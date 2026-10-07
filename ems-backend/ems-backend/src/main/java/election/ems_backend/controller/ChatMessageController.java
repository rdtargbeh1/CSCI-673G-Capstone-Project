package election.ems_backend.controller;

import election.ems_backend.dto.ChatMessageCreateRequest;
import election.ems_backend.dto.ChatMessageDto;
import election.ems_backend.service.ChatMessageService;
import election.ems_backend.utility.ChatMessageEditRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat/messages")
@RequiredArgsConstructor
public class ChatMessageController {

    private final ChatMessageService service;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ChatMessageDto send(@RequestBody ChatMessageCreateRequest req) {
        return service.sendInTenant(req);
    }

    @GetMapping("/{roomId}")
    public Page<ChatMessageDto> list(@PathVariable UUID roomId,
                                     @PageableDefault(size = 30) Pageable pageable) {
        return service.listInTenant(roomId, pageable);
    }

    @GetMapping("/{roomId}/sync")
    public List<ChatMessageDto> sync(@PathVariable UUID roomId,
                                     @RequestParam("since") String sinceIso) {
        return service.syncSinceInTenant(roomId, LocalDateTime.parse(sinceIso));
    }

    @PutMapping("/{messageId}")
    public ChatMessageDto edit(@PathVariable UUID messageId,
                               @RequestBody ChatMessageEditRequest req) {
        return service.editInTenant(messageId, req);
    }

    @DeleteMapping("/{messageId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID messageId) {
        service.deleteInTenant(messageId);
    }
}
