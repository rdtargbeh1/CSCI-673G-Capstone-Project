package election.ems_backend.controller;

import election.ems_backend.dto.AuditLogDto;
import election.ems_backend.enums.ActivityType;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.service.AuditLogService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

/**
 * Audit log read endpoints.
 * Constructor explicitly picks the JDBC-backed AuditLogService bean via @Qualifier to avoid ambiguous-bean errors.
 */
@RestController
@RequestMapping("/api/admin/audit")
public class AuditLogController {


    private final AuditLogService auditLogService;
    private final   AuthorizationService authz;

    public AuditLogController(AuditLogService auditLogService, AuthorizationService authz) {
        this.auditLogService = auditLogService;
        this.authz = authz;
    }

    @GetMapping
    public Page<AuditLogDto> search(
            // ✅ Tenant scope header (TENANT/NEC)
            @RequestHeader(value = "X-Org-Id", required = false) UUID headerOrgId,

            // ✅ SYSTEM mode uses orgId query param
            @RequestParam(value = "orgId", required = false) UUID orgId,

            @RequestParam(value = "userId", required = false) UUID userId,
            @RequestParam(value = "type", required = false) ActivityType type,
            @RequestParam(value = "from", required = false) LocalDateTime from,
            @RequestParam(value = "to", required = false) LocalDateTime to,
            @RequestParam(value = "q", required = false) String q,
            Pageable pageable
    ) {
        UUID effectiveOrgId = (headerOrgId != null) ? headerOrgId : orgId;

        // ✅ orgId is REQUIRED (tenant scoped)
        if (effectiveOrgId == null) {
            throw new ResponseStatusException(BAD_REQUEST, "orgId is required (tenant scoped)");
        }

        return auditLogService.search(effectiveOrgId, userId, type, from, to, q, pageable);
    }

    @PostMapping
    public AuditLogDto create(@RequestParam UUID orgId,
                              @RequestParam UUID userId,
                              @RequestParam ActivityType type,
                              @RequestParam String entity,
                              @RequestParam String description) {
        return auditLogService.log(orgId, userId, type, entity, description);
    }


    @GetMapping("/system")
    public Page<AuditLogDto> systemLogs(
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) ActivityType type,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(required = false) String q,
            Pageable pageable
    ) {
        authz.requirePlatformAdmin(); // SYSTEM_ADMIN only
        return auditLogService.searchSystemLogs(userId, type, from, to, q, pageable);
    }




}