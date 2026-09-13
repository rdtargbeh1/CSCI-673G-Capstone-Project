package election.ems_backend.controller;

import election.ems_backend.dto.ChatReactionDto;
import election.ems_backend.service.ChatReactionService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/chat/reactions")
public class ChatReactionController {

    private final ChatReactionService service;

    /** Toggle reaction for current user */
    @PostMapping("/{messageId}/toggle")
    public ChatReactionDto toggle(@PathVariable UUID messageId, @RequestBody ToggleRequest body) {
        return service.toggle(messageId, body.getEmoji());
    }

    /** Force remove current user’s reaction (idempotent) */
    @DeleteMapping("/{messageId}")
    public void remove(@PathVariable UUID messageId, @RequestParam String emoji) {
        service.remove(messageId, emoji);
    }

    /** List all reactions (with users) for a message */
    @GetMapping("/{messageId}")
    public List<ChatReactionDto> list(@PathVariable UUID messageId) {
        return service.listForMessage(messageId);
    }

    /** Aggregated counts by emoji for a message */
    @GetMapping("/{messageId}/counts")
    public Map<String, Long> counts(@PathVariable UUID messageId) {
        return service.countsForMessage(messageId);
    }

    @Data
    public static class ToggleRequest {
        private String emoji;
    }
}
