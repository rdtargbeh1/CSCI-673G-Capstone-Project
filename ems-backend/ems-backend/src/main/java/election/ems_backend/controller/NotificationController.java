package election.ems_backend.controller;

import election.ems_backend.dto.NotificationCreateRequest;
import election.ems_backend.dto.NotificationDto;
import election.ems_backend.enums.DeliveryMethod;
import election.ems_backend.enums.NotificationType;
import election.ems_backend.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService service;


    @PostMapping
    public List<NotificationDto> publish(@Valid @RequestBody NotificationCreateRequest req) {
        return service.publish(req);
    }


    @GetMapping
    public Page<NotificationDto> search(
            @RequestParam(required = false) UUID orgId,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) NotificationType type,
            @RequestParam(required = false) DeliveryMethod method,
            @RequestParam(required = false) Boolean unread,
            Pageable pageable
    ) {
        return service.search(orgId, userId, type, method, unread, pageable);
    }

    @GetMapping("/unread-count/{userId}")
    public long unreadCount(@RequestParam UUID userId) {
        return service.unreadCount(userId);
    }

    @PostMapping("/mark-read/{userId}")
    public int markRead(@PathVariable UUID userId, @RequestBody List<UUID> ids) {
        return service.markRead(userId, ids);
    }

    @PostMapping("/mark-seen/{userId}")
    public int markSeen(@PathVariable UUID userId, @RequestBody List<UUID> ids) {
        return service.markSeen(userId, ids);
    }

}
