
package election.ems_backend.controller;

import election.ems_backend.dto.*;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.service.ObserverReportService;
import election.ems_backend.tenant.TenantContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/observer-reports")
@RequiredArgsConstructor
public class ObserverReportController {

    private final ObserverReportService observerReportService;
    private final SystemUserRepository systemUserRepository;
    private final AuthorizationService authz;

    private static final Logger logger = LoggerFactory.getLogger(ObserverReportController.class);


    /**
     * Create an observer report with optional evidence files.
     */
    @PostMapping(
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<ObserverReportDto> create(
            @Valid @RequestPart("data") ObserverReportCreateRequest req,
            @RequestPart(name = "files", required = false) List<MultipartFile> files
    ) {
        ObserverReportDto dto = observerReportService.create(req, files == null ? List.of() : files);
        return ResponseEntity.ok(dto);
    }

    /**
     * Update an observer report
     */
    @PutMapping(
            value = "/{reportId}",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<ObserverReportDto> update(
            @PathVariable UUID reportId,
            @Valid @RequestPart("data") ObserverReportUpdateRequest req,
            @RequestPart(name = "files", required = false) List<MultipartFile> filesToAppend
    ) {
        ObserverReportDto dto = observerReportService.update(
                reportId,
                req,
                filesToAppend == null ? List.of() : filesToAppend
        );
        return ResponseEntity.ok(dto);
    }


    @DeleteMapping("/{id}")
    public void delete(@PathVariable UUID id) {
        observerReportService.delete(id);
    }


    @GetMapping("/{id}")
    public ObserverReportDto get(@PathVariable UUID id) {
        return observerReportService.get(id);
    }



    @GetMapping("/near")
    public java.util.List<ObserverReportDto> near(
            @RequestParam UUID orgId,
            @RequestParam double lat,
            @RequestParam double lon,
            @RequestParam(defaultValue = "2000") double meters
    ) {
        return observerReportService.near(orgId, lat, lon, meters);
    }


    /**
     * ✅ NEC DASHBOARD - PUT THIS FIRST (before generic search)
     * Only NEC/SYSTEM admins can access
     */
    /**
     * ✅ NEC DASHBOARD - See ALL reports for investigation
     * Only NEC/SYSTEM admins can access
     *
     * NEC can see:
     * - ALL statuses (PENDING, INTERNAL_VERIFIED, UNDER_INVESTIGATION, NEC_VERIFIED, REJECTED)
     * - ALL visibilities (PRIVATE, SHARED, PUBLIC)
     * - Reports from ALL tenants
     * - Filter by: type, isCritical, resolved, verificationStatus, visibility, date range, search
     */
    @GetMapping("/nec/dashboard")
    @Transactional(readOnly = true)
    public Page<ObserverReportDto> necDashboard(
            @RequestParam(required = false) UUID observerId,
            @RequestParam(required = false) UUID countyId,
            @RequestParam(required = false) UUID centerId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Boolean isCritical,
            @RequestParam(required = false) Boolean resolved,
            @RequestParam(required = false) String verificationStatus,
            @RequestParam(required = false) String visibility,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 20, sort = "timestamp", direction = Sort.Direction.DESC) Pageable pageable,
            Authentication authentication
    ) {
        logger.info("=== NEC DASHBOARD START ===");

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }

        boolean isNecAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority() != null &&
                        (a.getAuthority().equalsIgnoreCase("ROLE_NEC_ADMIN") ||
                                a.getAuthority().equalsIgnoreCase("ROLE_SYSTEM_ADMIN"))
                );

        if (!isNecAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only NEC admins");
        }

        logger.info("User (from auth): {}, IsNecAdmin: {}", authentication.getName(), isNecAdmin);

        // ✅ Use TenantContext - It already has userId and orgId set by your filter
        UUID necOrgId = TenantContext.getCurrentOrgIdOrNull();
        UUID userId = TenantContext.getCurrentUserIdOrNull();

        logger.info("OrgId from TenantContext: {}, UserId: {}", necOrgId, userId);

        // ✅ Check if SYSTEM_ADMIN (no orgId required, see ALL)
        boolean isSystemAdmin = TenantContext.isSystemAdminContext();
        logger.info("IsSystemAdmin: {}", isSystemAdmin);

        if (isSystemAdmin) {
//            logger.info("=== SYSTEM_ADMIN - CALLING SYSTEM SERVICE ===");
            SystemUser currentUser = new SystemUser();
            currentUser.setUserId(userId);
            currentUser.setUserName(authentication.getName());

            return observerReportService.searchSystem(
                    observerId, countyId, centerId, type, isCritical, resolved,
                    verificationStatus, visibility, from, to, q, pageable,
                    currentUser
            );
        }

        // ✅ NEC_ADMIN must have orgId
        if (necOrgId == null) {
            logger.error("NEC_ADMIN must have orgId in TenantContext!");
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Organization ID not found");
        }

//        logger.info("=== NEC_ADMIN - CALLING NEC SERVICE ===");
//        logger.info("User: {}, OrgId: {}, UserId: {}", authentication.getName(), necOrgId, userId);

        SystemUser currentUser = new SystemUser();
        currentUser.setUserId(userId);
        currentUser.setUserName(authentication.getName());

        return observerReportService.searchNec(
                observerId, countyId, centerId, type, isCritical, resolved,
                verificationStatus, visibility, from, to, q, pageable,
                currentUser, necOrgId
        );
    }


    /**
     * ✅ SEARCH REPORTS - Works for both TENANT and NEC
     *
     * TENANT can see:
     * - Own organization's ALL reports (any status/visibility)
     * - Other tenants' NEC_VERIFIED + SHARED reports
     * - Any tenant's NEC_VERIFIED + PUBLIC reports
     *
     * NEC can see:
     * - ALL reports from ALL tenants (no visibility filter)
     */
    @GetMapping
//    @Transactional(readOnly = true)
    public Page<ObserverReportDto> search(
            @RequestParam(required = false) UUID observerId,
            @RequestParam(required = false) UUID countyId,
            @RequestParam(required = false) UUID centerId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Boolean isCritical,
            @RequestParam(required = false) Boolean resolved,
            @RequestParam(required = false) String verificationStatus,
            @RequestParam(required = false) String visibility,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) UUID orgId,
            @PageableDefault(size = 20, sort = "timestamp", direction = Sort.Direction.DESC) Pageable pageable,
            Authentication authentication
    ) {
        // ✅ Verify authentication
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }

        // ✅ Extract userId from JWT
        UUID userId = extractUserIdFromJwt(authentication);

        // ✅ Check if user is NEC/SYSTEM admin
        boolean isNecAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority() != null &&
                        (a.getAuthority().equalsIgnoreCase("ROLE_NEC_ADMIN") ||
                                a.getAuthority().equalsIgnoreCase("ROLE_SYSTEM_ADMIN"))
                );

        // ✅ Determine orgId
        UUID resolvedOrgId = orgId;

        if (resolvedOrgId == null) {
            resolvedOrgId = extractOrgIdFromJwt(authentication);
        }

        if (resolvedOrgId == null && !isNecAdmin) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Organization ID required for tenant users"
            );
        }

        // ✅ Create SystemUser object
        SystemUser currentUser = new SystemUser();
        currentUser.setUserId(userId);
        currentUser.setUserName(authentication.getName());

        // ✅ Call service
        return observerReportService.search(
                observerId,
                countyId,
                centerId,
                type,
                isCritical,
                resolved,
                verificationStatus,
                visibility,
                from,
                to,
                q,
                pageable,
                currentUser,
                resolvedOrgId
        );
    }



    /**
     * ✅ RESOLVE REPORT - Mark case as closed
     *
     * Can only resolve if status is:
     * - INTERNAL_VERIFIED (tenant resolved internally)
     * - NEC_VERIFIED (NEC verified and approved)
     *
     * Authorization:
     * - Tenant admin: Can resolve own organization's reports
     * - NEC admin: Can resolve any report
     */
    @PutMapping("/{reportId}/resolve")
    public ResponseEntity<ObserverReportDto> resolve(
            @PathVariable UUID reportId,
            @RequestBody @Valid ObserverReportResolveRequest req,
            Authentication authentication
    ) {

        authz.requireAny("TENANT_ADMIN", "ADMIN", "NEC_ADMIN");


        // ✅ Verify authentication
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }

        // ✅ Extract current user
        SystemUser currentUser = null;

        if (authentication.getPrincipal() instanceof SystemUser) {
            currentUser = (SystemUser) authentication.getPrincipal();
        } else if (authentication.getPrincipal() instanceof Jwt jwt) {
            UUID userId = extractUserIdFromJwt(authentication);
            currentUser = new SystemUser();
            currentUser.setUserId(userId);
            currentUser.setUserName(authentication.getName());
        }

        if (currentUser == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Could not extract user from authentication"
            );
        }

        // ✅ Authorization: Only NEC_ADMIN, TENANT_ADMIN, SYSTEM_ADMIN
        boolean isAuthorized = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority() != null &&
                        (a.getAuthority().equalsIgnoreCase("ROLE_NEC_ADMIN") ||
                                a.getAuthority().equalsIgnoreCase("ROLE_TENANT_ADMIN") ||
                                a.getAuthority().equalsIgnoreCase("ROLE_SYSTEM_ADMIN"))
                );

        if (!isAuthorized) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Only NEC_ADMIN, TENANT_ADMIN, or SYSTEM_ADMIN can resolve reports"
            );
        }

        return ResponseEntity.ok(
                observerReportService.resolveReport(reportId, req, currentUser)
        );
    }

    /**
     * ✅ VERIFY REPORT - Tenant or NEC verification
     *
     * TENANT ADMIN workflow:
     * - PENDING → INTERNAL_VERIFIED (minor, handle internally, LOCKED)
     * - PENDING → UNDER_INVESTIGATION (critical, escalate to NEC, EDITABLE)
     * - UNDER_INVESTIGATION → PENDING (withdraw from NEC)
     * - REJECTED → UNDER_INVESTIGATION (re-escalate)
     *
     * NEC ADMIN workflow:
     * - UNDER_INVESTIGATION → NEC_VERIFIED (verified, LOCKED)
     * - UNDER_INVESTIGATION → REJECTED (not substantiated, EDITABLE)
     *
     * Authorization:
     * - Tenant admin: Can verify own organization's reports
     * - NEC admin: Can verify any escalated report
     * - System admin: Can verify any report
     */
    @PutMapping("/{reportId}/verify")
    public ResponseEntity<ObserverReportDto> verify(
            @PathVariable UUID reportId,
            @RequestBody @Valid ObserverReportVerificationRequest req,
            Authentication authentication
    ) {

        authz.requireAny("TENANT_ADMIN", "ADMIN", "NEC_ADMIN");

        // ✅ Verify authentication
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }

        // ✅ Extract current user
        SystemUser currentUser = null;

        if (authentication.getPrincipal() instanceof SystemUser) {
            currentUser = (SystemUser) authentication.getPrincipal();
        } else if (authentication.getPrincipal() instanceof Jwt jwt) {
            UUID userId = extractUserIdFromJwt(authentication);
            currentUser = new SystemUser();
            currentUser.setUserId(userId);
            currentUser.setUserName(authentication.getName());
        }

        if (currentUser == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Could not extract user from authentication"
            );
        }

        // ✅ Authorization: Only NEC_ADMIN, TENANT_ADMIN, SYSTEM_ADMIN (not OBSERVER)
        boolean isAuthorized = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority() != null &&
                        (a.getAuthority().equalsIgnoreCase("ROLE_NEC_ADMIN") ||
                                a.getAuthority().equalsIgnoreCase("ROLE_TENANT_ADMIN") ||
                                a.getAuthority().equalsIgnoreCase("ROLE_SYSTEM_ADMIN"))
                );

        if (!isAuthorized) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Only NEC_ADMIN, TENANT_ADMIN, or SYSTEM_ADMIN can verify reports"
            );
        }

        return ResponseEntity.ok(
                observerReportService.verifyReport(reportId, req)
        );
    }


    // ============================================================
    // ✅ HELPER METHOD
    // ============================================================

    /**
     * ✅ Extract userId from JWT
     */
    private UUID extractUserIdFromJwt(Authentication authentication) {
        if (!(authentication.getPrincipal() instanceof Jwt jwt)) {
            return null;
        }

        Object claim = jwt.getClaim("userId");
        if (claim == null) claim = jwt.getClaim("user_id");
        if (claim == null) claim = jwt.getClaim("id");
        if (claim == null) claim = jwt.getSubject();

        if (claim instanceof String s) {
            try {
                return UUID.fromString(s);
            } catch (IllegalArgumentException ignored) {
                return null;
            }
        }

        return null;
    }


    /**
     * ✅ Extract orgId from JWT
     */
    private UUID extractOrgIdFromJwt(Authentication authentication) {
        if (!(authentication.getPrincipal() instanceof Jwt jwt)) {
            return null;
        }

        Object claim = jwt.getClaim("orgId");
        if (claim == null) claim = jwt.getClaim("org_id");
        if (claim == null) claim = jwt.getClaim("defaultOrgId");

        if (claim instanceof String s) {
            try {
                return UUID.fromString(s);
            } catch (IllegalArgumentException ignored) {
                return null;
            }
        }

        return null;
    }



}


