package election.ems_backend.controller;

import election.ems_backend.dto.AuditLogDto;
import election.ems_backend.enums.ActivityType;
import election.ems_backend.service.AuditLogService;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Audit log read endpoints.
 * Constructor explicitly picks the JDBC-backed AuditLogService bean via @Qualifier to avoid ambiguous-bean errors.
 */
@RestController
@RequestMapping("/api/admin/audit")
public class AuditLogController {

    private final AuditLogService auditLogService;

    // Explicitly qualify the desired AuditLogService bean to resolve ambiguity
    public AuditLogController(@Qualifier("auditLogServiceJdbc") AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping
    public Page<AuditLogDto> search(
            @RequestParam(value = "orgId", required = false) UUID orgId,
            @RequestParam(value = "userId", required = false) UUID userId,
            @RequestParam(value = "type", required = false) ActivityType type,
            @RequestParam(value = "from", required = false) LocalDateTime from,
            @RequestParam(value = "to", required = false) LocalDateTime to,
            @RequestParam(value = "q", required = false) String q,
            Pageable pageable) {

        return auditLogService.search(orgId, userId, type, from, to, q, pageable);
    }


    // Optional: manual logging endpoint (handy for admin tools)
    @PostMapping
    public AuditLogDto create(@RequestParam UUID orgId,
                              @RequestParam UUID userId,
                              @RequestParam ActivityType type,
                              @RequestParam String entity,
                              @RequestParam String description) {
        return auditLogService.log(orgId, userId, type, entity, description);
    }
}