package election.ems_backend.controller;


import election.ems_backend.dto.UserSigningKeyCreateRequest;
import election.ems_backend.dto.UserSigningKeyDto;
import election.ems_backend.service.UserSigningKeyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users/{userId}/signing-keys")
@RequiredArgsConstructor
public class UserSigningKeyController {

    private final UserSigningKeyService service;

    @PostMapping
    public ResponseEntity<UserSigningKeyDto> create(@PathVariable UUID userId, @RequestBody UserSigningKeyCreateRequest req) {
        UserSigningKeyDto dto = service.createForUser(userId, req);
        return ResponseEntity.created(URI.create("/api/users/" + userId + "/signing-keys/" + dto.getKeyId())).body(dto);
    }

    @GetMapping
    public List<UserSigningKeyDto> list(@PathVariable UUID userId) {
        return service.listForUser(userId);
    }

    @GetMapping("/{keyId}")
    public UserSigningKeyDto get(@PathVariable UUID userId, @PathVariable UUID keyId) {
        // service validates existence; userId is part of path for scoping but we look up by keyId
        return service.getById(keyId);
    }

    @PostMapping("/{keyId}/revoke")
    public UserSigningKeyDto revoke(@PathVariable UUID userId, @PathVariable UUID keyId) {
        return service.revoke(keyId);
    }
}