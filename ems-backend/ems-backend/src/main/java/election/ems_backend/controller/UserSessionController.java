package election.ems_backend.controller;

import election.ems_backend.dto.UserSessionCreateRequest;
import election.ems_backend.dto.UserSessionDto;
import election.ems_backend.service.implement.UserSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sessions")
@RequiredArgsConstructor
public class UserSessionController {

    private final UserSessionService service;

    @PostMapping
    public UserSessionDto create(@RequestBody UserSessionCreateRequest req) {
        return service.create(req);
    }

    @GetMapping("/user/{userId}")
    public List<UserSessionDto> getUserSessions(@PathVariable UUID userId) {
        return service.getUserSessions(userId);
    }

    @GetMapping("/user/{userId}/active")
    public List<UserSessionDto> getActiveSessions(@PathVariable UUID userId) {
        return service.getActiveSessions(userId);
    }

    @DeleteMapping("/{sessionId}")
    public ResponseEntity<Void> revoke(@PathVariable UUID sessionId) {
        service.revoke(sessionId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/user/{userId}")
    public ResponseEntity<Void> revokeAll(@PathVariable UUID userId) {
        service.revokeAll(userId);
        return ResponseEntity.noContent().build();
    }
}
