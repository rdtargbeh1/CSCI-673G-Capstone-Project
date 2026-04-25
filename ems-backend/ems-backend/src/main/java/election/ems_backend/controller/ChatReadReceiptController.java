package election.ems_backend.controller;

import election.ems_backend.dto.ChatReadReceiptDto;
import election.ems_backend.service.ChatReadReceiptService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/chat/read-receipts")
public class ChatReadReceiptController {

    private final ChatReadReceiptService service;

    @PostMapping("/{messageId}/read")
    public ChatReadReceiptDto markRead(@PathVariable UUID messageId) {
        return service.markReadForCurrentUser(messageId);
    }

    @GetMapping("/{messageId}/readers")
    public List<ChatReadReceiptDto> readers(@PathVariable UUID messageId) {
        return service.listReaders(messageId);
    }

    @GetMapping("/{messageId}/count")
    public long readerCount(@PathVariable UUID messageId) {
        return service.readerCount(messageId);
    }

    @PostMapping("/read/bulk")
    public int bulkMarkRead(@RequestBody BulkReadRequest body) {
        return service.markManyReadForCurrentUser(body.getMessageIds());
    }

    @Data
    public static class BulkReadRequest {
        private List<UUID> messageIds;
    }
}
