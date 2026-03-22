package election.ems_backend.service.implement;


import election.ems_backend.dto.*;
import election.ems_backend.entity.*;
import election.ems_backend.enums.*;
import election.ems_backend.mapper.ObserverReportMapper;
import election.ems_backend.repository.*;
import election.ems_backend.service.FileUploadService;
import election.ems_backend.service.NotificationService;
import election.ems_backend.service.ObserverReportService;
import election.ems_backend.utility.ObserverReportSpecs;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
public class ObserverReportServiceImplementation implements ObserverReportService {

    private final ObserverReportRepository repo;
    private final OrganizationRepository orgRepo;
    private final SystemUserRepository userRepo;
    private final CountyRepository countyRepo;
    private final DistrictRepository districtRepository;
    private final PollingCenterRepository centerRepo;
    private final FileUploadService fileUploadService;
    private final NotificationService notificationService;
    private final NotificationRepository notificationRepository;

    private static final Logger log = LoggerFactory.getLogger(ObserverReportServiceImplementation.class);
    private final ObserverReportMapper mapper = new ObserverReportMapper();


    @Override
    public ObserverReportDto create(ObserverReportCreateRequest req, List<MultipartFile> files) {
        Organization org = orgRepo.findById(req.getOrgId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Organization not found"));
        SystemUser observer = userRepo.findById(req.getObserverId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Observer not found"));

        County county = null;
        District district = null;
        PollingCenter center = null;

        if (req.getCenterId() != null) {

            center = centerRepo.findById(req.getCenterId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Polling center not found"));

            district = center.getDistrict();
            county = district.getCounty();

        } else if (req.getDistrictId() != null) {

            district = districtRepository.findById(req.getDistrictId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "District not found"));

            county = district.getCounty();

        } else if (req.getCountyId() != null) {

            county = countyRepo.findById(req.getCountyId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "County not found"));
        }

        if ((req.getLatitude() == null) ^ (req.getLongitude() == null)) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Both latitude and longitude are required for GPS"
            );
        }

        ObserverReport saved = repo.save(
                mapper.toEntity(req, org, observer, county,  center, district)
        );

        // --- FILE UPLOADS (optional evidence) ---
        if (files != null && !files.isEmpty()) {
            // related_table = "observer_report"
            fileUploadService.saveAllForEntity(
                    org,
                    "observer_report",
                    saved.getReportId(),
                    observer,               // uploaded_by
                    files,
                    Map.of("category", "EVIDENCE") // optional tags/metadata
            );
        }

        // --- NOTIFICATION to the observer (IN_APP + EMAIL) ---
        // Use idempotency so duplicates don’t happen on retries
        notify(
                org.getOrgId(), observer.getUserId(),
                NotificationType.ALERT,
                "Observer Report Submitted",
                buildReportMessage(saved, center),
                "observer_report", saved.getReportId(),
                NotificationPriority.NORMAL,
                EnumSet.of(DeliveryMethod.IN_APP, DeliveryMethod.EMAIL),
                "obs-" + saved.getReportId() + "-created"
        );

        return mapper.toDTO(saved);
    }


    @Override
    public ObserverReportDto update(UUID reportId, ObserverReportUpdateRequest req, List<MultipartFile> filesToAppend) {
        ObserverReport entity = repo.findById(reportId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Report not found"));


        if (Boolean.TRUE.equals(entity.getResolved())) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Resolved reports cannot be modified"
            );
        }

        County newCounty = null;
        District district = null;
        PollingCenter newCenter = null;

        if (req.getCenterId() != null) {
            newCenter = centerRepo.findById(req.getCenterId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Polling center not found"));
            district = newCenter.getDistrict();
            newCounty = district.getCounty();

        } else if (req.getDistrictId() != null) {
            district = districtRepository.findById(req.getDistrictId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "District not found"));
            newCounty = district.getCounty();

        } else if (req.getCountyId() != null) {
            newCounty = countyRepo.findById(req.getCountyId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "County not found"));
        }

        if ((req.getLatitude() == null) ^ (req.getLongitude() == null)) {
            throw new ResponseStatusException(BAD_REQUEST, "Both latitude and longitude are required for GPS");
        }

        mapper.apply(req, entity, newCounty,  newCenter, district);
        ObserverReport saved = repo.save(entity);

        // --- APPEND NEW EVIDENCE (if provided) ---
        if (filesToAppend != null && !filesToAppend.isEmpty()) {
            fileUploadService.saveAllForEntity(
                    saved.getOrganization(),
                    "observer_report",
                    saved.getReportId(),
                    saved.getObserver(),
                    filesToAppend,
                    Map.of("category", "EVIDENCE", "action", "APPEND")
            );
        }

        // --- NOTIFY observer (update) ---
        notify(
                saved.getOrganization().getOrgId(),
                saved.getObserver().getUserId(),
                NotificationType.ALERT,
                "Observer Report Updated",
                "Your observer report has been updated.",
                "observer_report", saved.getReportId(),
                NotificationPriority.LOW,
                EnumSet.of(DeliveryMethod.IN_APP, DeliveryMethod.EMAIL),
                "obs-" + saved.getReportId() + "-updated-" + saved.getTimestamp() // simple uniqueness
        );

        return mapper.toDTO(saved);
    }

    @Override
    public void delete(UUID reportId) {
        ObserverReport entity = repo.findById(reportId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Report not found"));

        repo.delete(entity);

        // --- NOTIFY observer (deleted) ---
        notify(
                entity.getOrganization().getOrgId(),
                entity.getObserver().getUserId(),
                NotificationType.ALERT,
                "Observer Report Deleted",
                "Your observer report was deleted.",
                "observer_report", entity.getReportId(),
                NotificationPriority.LOW,
                EnumSet.of(DeliveryMethod.IN_APP, DeliveryMethod.EMAIL),
                "obs-" + entity.getReportId() + "-deleted"
        );
    }



    /**
     * ✅ NEC DASHBOARD SEARCH: See ALL reports
     *
     * NEC can see:
     * - ALL statuses (PENDING, INTERNAL_VERIFIED, UNDER_INVESTIGATION, NEC_VERIFIED, REJECTED)
     * - ALL visibilities (PRIVATE, SHARED, PUBLIC)
     * - Reports from ALL tenants
     */
    @Override
    @Transactional(readOnly = true)
    public Page<ObserverReportDto> searchNec(
            UUID observerId,
            UUID countyId,
            UUID centerId,
            String type,
            Boolean isCritical,
            Boolean resolved,
            String verificationStatus,
            String visibility,
            LocalDateTime from,
            LocalDateTime to,
            String q,
            Pageable pageable,
            SystemUser currentUser,
            UUID necOrgId
    ) {
        if (necOrgId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "NEC organization ID required");
        }

        log.info("NEC search - user: {}, orgId: {}", currentUser.getUserName(), necOrgId);

        // ✅ Use forNec spec
        Specification<ObserverReport> spec = ObserverReportSpecs.forNec(necOrgId);

        spec = spec
                .and(ObserverReportSpecs.observerEquals(observerId))
                .and(ObserverReportSpecs.countyEquals(countyId))
                .and(ObserverReportSpecs.centerEquals(centerId))
                .and(ObserverReportSpecs.typeEquals(type))
                .and(ObserverReportSpecs.isCriticalEquals(isCritical))
                .and(ObserverReportSpecs.resolvedEquals(resolved))
                .and(ObserverReportSpecs.verificationStatusEquals(verificationStatus))
                .and(ObserverReportSpecs.visibilityEquals(visibility))
                .and(ObserverReportSpecs.between(from, to))
                .and(ObserverReportSpecs.textSearch(q));

        return repo.findAll(spec, pageable).map(mapper::toDTO);
    }


    /**
     * ✅ TENANT DASHBOARD SEARCH: See own + shared/public from others
     *
     * Tenant can see:
     * - Own organization's ALL reports (any status/visibility)
     * - Other tenants' NEC_VERIFIED + SHARED reports
     * - Any tenant's NEC_VERIFIED + PUBLIC reports
     */
    @Override
    @Transactional(readOnly = true)
    public Page<ObserverReportDto> search(
            UUID observerId,
            UUID countyId,
            UUID centerId,
            String type,
            Boolean isCritical,
            Boolean resolved,
            String verificationStatus,
            String visibility,
            LocalDateTime from,
            LocalDateTime to,
            String q,
            Pageable pageable,
            SystemUser currentUser,
            UUID orgId
    ) {
        // ✅ Verify user and orgId
        if (currentUser == null || currentUser.getUserId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }

        if (orgId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Organization ID required");
        }

        log.info("Tenant search - orgId: {}, user: {}", orgId, currentUser.getUserName());

        // ✅ Use visibleToTenant spec - Own org ALL + other orgs NEC_VERIFIED+SHARED/PUBLIC
        Specification<ObserverReport> spec = ObserverReportSpecs.visibleToTenant(orgId);

        // ✅ Apply optional filters
        spec = spec
                .and(ObserverReportSpecs.observerEquals(observerId))
                .and(ObserverReportSpecs.countyEquals(countyId))
                .and(ObserverReportSpecs.centerEquals(centerId))
                .and(ObserverReportSpecs.typeEquals(type))
                .and(ObserverReportSpecs.isCriticalEquals(isCritical))
                .and(ObserverReportSpecs.resolvedEquals(resolved))
                .and(ObserverReportSpecs.verificationStatusEquals(verificationStatus))
                .and(ObserverReportSpecs.visibilityEquals(visibility))
                .and(ObserverReportSpecs.between(from, to))
                .and(ObserverReportSpecs.textSearch(q));

        return repo.findAll(spec, pageable).map(mapper::toDTO);
    }



    @Override
    @Transactional(readOnly = true)
    public Page<ObserverReportDto> searchSystem(
            UUID observerId,
            UUID countyId,
            UUID centerId,
            String type,
            Boolean isCritical,
            Boolean resolved,
            String verificationStatus,
            String visibility,
            LocalDateTime from,
            LocalDateTime to,
            String q,
            Pageable pageable,
            SystemUser currentUser
    ) {
        log.info("System admin search - user: {}", currentUser.getUserName());

        // ✅ Use forSystem spec - No tenant restrictions
        Specification<ObserverReport> spec = ObserverReportSpecs.forSystem();

        // ✅ Apply optional filters (same as search() and searchNec())
        spec = spec
                .and(ObserverReportSpecs.observerEquals(observerId))
                .and(ObserverReportSpecs.countyEquals(countyId))
                .and(ObserverReportSpecs.centerEquals(centerId))
                .and(ObserverReportSpecs.typeEquals(type))
                .and(ObserverReportSpecs.isCriticalEquals(isCritical))
                .and(ObserverReportSpecs.resolvedEquals(resolved))
                .and(ObserverReportSpecs.verificationStatusEquals(verificationStatus))
                .and(ObserverReportSpecs.visibilityEquals(visibility))
                .and(ObserverReportSpecs.between(from, to))
                .and(ObserverReportSpecs.textSearch(q));

        return repo.findAll(spec, pageable).map(mapper::toDTO);
    }


    /**
     * ✅ Check if user has system role
     */
    private boolean hasSystemRole(SystemUser user, RoleName... roles) {
        if (user == null || user.getRole() == null) {
            return false;
        }

        RoleName userRole = user.getRole().getRoleName();

        return Arrays.stream(roles)
                .anyMatch(r -> r == userRole);
    }


    @Override
    @Transactional
    public ObserverReportDto resolveReport(
            UUID reportId,
            ObserverReportResolveRequest req,
            SystemUser currentUser
    ) {
        // ✅ Verify user exists
        if (currentUser == null || currentUser.getUserId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }

        // 🔍 LOAD REPORT
        ObserverReport report = repo.findById(reportId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Report not found"));

        // 🔐 AUTHORIZATION: Tenant admin can only resolve their own org's reports
        boolean isNecAdmin = hasSystemRole(currentUser, RoleName.SYSTEM_ADMIN, RoleName.NEC_ADMIN);
        boolean isTenantAdmin = hasSystemRole(currentUser, RoleName.TENANT_ADMIN);

        if (isTenantAdmin && !isNecAdmin) {
            UUID reportOrgId = report.getOrganization().getOrgId();
            UUID userOrgId = currentUser.getDefaultOrg() != null
                    ? currentUser.getDefaultOrg().getOrgId()
                    : null;

            if (userOrgId == null || !userOrgId.equals(reportOrgId)) {
                throw new ResponseStatusException(
                        FORBIDDEN,
                        "Tenant admins can only resolve their own organization's reports"
                );
            }
        }

        // ============================================================
        // ✅ MODEL 2: CAN ONLY RESOLVE IF STATUS IS LOCKED
        // ============================================================
        // isResolved = true ONLY when:
        // - verification_status == INTERNAL_VERIFIED, OR
        // - verification_status == NEC_VERIFIED

        ObserverReportVerificationStatus status = report.getVerificationStatus();

        if (status != ObserverReportVerificationStatus.INTERNAL_VERIFIED &&
                status != ObserverReportVerificationStatus.NEC_VERIFIED) {

            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Report can only be resolved when status is INTERNAL_VERIFIED or NEC_VERIFIED. " +
                            "Current status: " + status
            );
        }

        // 🔐 RULE: Cannot resolve twice
        if (Boolean.TRUE.equals(report.getResolved())) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Report is already resolved"
            );
        }

        // 🔐 RULE: Resolution note is required
        if (req.getNote() == null || req.getNote().trim().isEmpty()) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Resolution note is required"
            );
        }

        // ✅ RESOLVE THE REPORT
        report.setResolved(true);
        report.setResolvedAt(LocalDateTime.now());
        report.setResolvedBy(currentUser.getUserId());
        report.setResolvedNote(req.getNote().trim());

        ObserverReport saved = repo.save(report);

        log.info("Report {} resolved by user {} with note: {}",
                reportId, currentUser.getUserId(), req.getNote());

        // =========================================================
        // 🔔 NOTIFICATION (SAFE + IDEMPOTENT)
        // =========================================================
        try {
            String key = "obs-" + reportId + "-resolved";

            if (!notificationRepository.existsByIdempotencyKey(key)) {

                String statusMessage = status == ObserverReportVerificationStatus.INTERNAL_VERIFIED
                        ? "Your observer report has been resolved internally."
                        : "Your observer report has been verified and resolved by NEC.";

                notify(
                        saved.getOrganization().getOrgId(),
                        saved.getObserver().getUserId(),
                        NotificationType.ALERT,
                        "Observer Report Resolved",
                        statusMessage,
                        "observer_report",
                        saved.getReportId(),
                        NotificationPriority.NORMAL,
                        EnumSet.of(DeliveryMethod.IN_APP, DeliveryMethod.EMAIL),
                        key
                );
            }

        } catch (Exception ex) {
            // 🔥 NEVER BREAK MAIN FLOW BECAUSE OF NOTIFICATION
            log.warn("Notification failed for report {}: {}", reportId, ex.getMessage());
        }

        return mapper.toDTO(saved);
    }


    @Override
    @Transactional
    public ObserverReportDto verifyReport(
            UUID reportId,
            ObserverReportVerificationRequest req
    ) {

        // 🔐 AUTH CONTEXT
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !(auth.getPrincipal() instanceof Jwt jwt)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid authentication");
        }

        // ✅ Extract current user ID from JWT
        UUID userId = UUID.fromString(jwt.getSubject());

        SystemUser currentUser = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        // 🔥 ROLE CHECK (JWT-based)
        boolean isNecAdmin = auth.getAuthorities().stream()
                .anyMatch(a ->
                        a.getAuthority().equals("ROLE_NEC_ADMIN") ||
                                a.getAuthority().equals("ROLE_SYSTEM_ADMIN")
                );

        boolean isTenantAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_TENANT_ADMIN"));

        if (!isNecAdmin && !isTenantAdmin) {
            throw new ResponseStatusException(FORBIDDEN, "Not authorized to verify reports");
        }

        // 🔍 LOAD REPORT
        ObserverReport report = repo.findById(reportId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Report not found"));

        // ✅ Get current user's org ID
        UUID userOrgId = currentUser.getDefaultOrg() != null
                ? currentUser.getDefaultOrg().getOrgId()
                : null;

        UUID reportOrgId = report.getOrganization().getOrgId();

        // ✅ NEW: Determine if NEC is acting on OWN org or OTHER org
        boolean isNecOnOwnOrg = isNecAdmin && userOrgId != null && userOrgId.equals(reportOrgId);
        boolean isNecOnOtherOrg = isNecAdmin && (userOrgId == null || !userOrgId.equals(reportOrgId));

        // 🔐 AUTHORIZATION: Tenant admin can only verify their own organization's reports
        if (isTenantAdmin && !isNecAdmin) {
            if (userOrgId == null || !userOrgId.equals(reportOrgId)) {
                throw new ResponseStatusException(
                        FORBIDDEN,
                        "Tenant admins can only verify their own organization's reports"
                );
            }
        }

        // 🔐 RULE: Cannot modify after locked (INTERNAL_VERIFIED or NEC_VERIFIED)
        if (report.getVerificationStatus() == ObserverReportVerificationStatus.INTERNAL_VERIFIED ||
                report.getVerificationStatus() == ObserverReportVerificationStatus.NEC_VERIFIED) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Cannot modify reports in locked state. Status: " + report.getVerificationStatus()
            );
        }

        // 🔐 RULE: Cannot modify after resolved
        if (Boolean.TRUE.equals(report.getResolved())) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Resolved reports cannot be modified"
            );
        }

        // ✅ Parse status safely
        ObserverReportVerificationStatus status;
        try {
            status = ObserverReportVerificationStatus.valueOf(req.getStatus());
        } catch (Exception ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid verification status");
        }

        // ============================================================
        // ✅ WORKFLOW LOGIC - Different flows for Tenant vs NEC
        // ============================================================

        if (isTenantAdmin && !isNecAdmin) {
            // ====================================================================
            // 🟢 TENANT ADMIN WORKFLOW
            // ====================================================================
            validateTenantVerification(report.getVerificationStatus(), status);
            if (status == ObserverReportVerificationStatus.INTERNAL_VERIFIED) {
                verifyReportAsInternal(report, req);
            } else if (status == ObserverReportVerificationStatus.UNDER_INVESTIGATION) {
                escalateReportToNec(report, req);
            } else if (status == ObserverReportVerificationStatus.PENDING) {
                withdrawReportFromNec(report, req);
            } else {
                throw new ResponseStatusException(
                        FORBIDDEN,
                        "Tenant admins can only set status to INTERNAL_VERIFIED, UNDER_INVESTIGATION, or PENDING"
                );
            }

        } else if (isNecOnOwnOrg) {
            // ====================================================================
            // 🟣 NEC VERIFYING OWN ORG (NEC acts as tenant)
            // ====================================================================
            // ✅ NEW: NEC can verify own org reports like tenants
            // Allow: PENDING → INTERNAL_VERIFIED or UNDER_INVESTIGATION
            validateTenantVerification(report.getVerificationStatus(), status);

            if (status == ObserverReportVerificationStatus.INTERNAL_VERIFIED) {
                verifyReportAsInternal(report, req);
            } else if (status == ObserverReportVerificationStatus.UNDER_INVESTIGATION) {
                escalateReportToNec(report, req);
            } else if (status == ObserverReportVerificationStatus.PENDING) {
                withdrawReportFromNec(report, req);
            } else if (status == ObserverReportVerificationStatus.NEC_VERIFIED) {
                // ✅ NEC can also mark own report as NEC_VERIFIED
                verifyReportAsNecOwn(report, req);
            } else {
                throw new ResponseStatusException(
                        FORBIDDEN,
                        "NEC can only set status to INTERNAL_VERIFIED, NEC_VERIFIED, UNDER_INVESTIGATION, or PENDING for own org"
                );
            }

        } else if (isNecOnOtherOrg) {
            // ====================================================================
            // 🔵 NEC VERIFYING OTHER ORG (NEC authority)
            // ====================================================================
            // ✅ NEC authority: only UNDER_INVESTIGATION → NEC_VERIFIED or REJECTED
            validateNecVerification(report.getVerificationStatus(), status);

            if (status == ObserverReportVerificationStatus.NEC_VERIFIED) {
                verifyReportAsNec(report, req);
            } else if (status == ObserverReportVerificationStatus.REJECTED) {
                rejectReport(report, req);
            } else {
                throw new ResponseStatusException(
                        FORBIDDEN,
                        "NEC can only set status to NEC_VERIFIED or REJECTED for other orgs"
                );
            }
        }

        ObserverReport saved = repo.save(report);

        // =========================================================
        // 🔔 NOTIFICATION (SAFE + IDEMPOTENT)
        // =========================================================
        try {
            String key = "obs-" + saved.getReportId() + "-" + saved.getVerificationStatus() + "-" + System.currentTimeMillis();

            if (!notificationRepository.existsByIdempotencyKey(key)) {

                String message = switch (saved.getVerificationStatus()) {
                    case INTERNAL_VERIFIED -> "Your observer report has been verified internally. Status: Resolved.";

                    case UNDER_INVESTIGATION -> "Your observer report has been escalated to NEC for investigation.";

                    case NEC_VERIFIED -> "Your observer report has been verified by NEC. Visibility: " +
                            (saved.getVisibility() == ObserverReportVisibility.PUBLIC ? "Public" :
                                    saved.getVisibility() == ObserverReportVisibility.SHARED ? "Shared with other tenants" :
                                            "Private");

                    case REJECTED -> "Your observer report has been rejected by NEC. Reason: " +
                            (saved.getVerificationNote() != null ? saved.getVerificationNote() : "Not specified");

                    case PENDING -> "Your observer report status has been updated.";
                };

                notify(
                        saved.getOrganization().getOrgId(),
                        saved.getObserver().getUserId(),
                        NotificationType.ALERT,
                        "Observer Report Status Update",
                        message,
                        "observer_report",
                        saved.getReportId(),
                        NotificationPriority.HIGH,
                        EnumSet.of(DeliveryMethod.IN_APP, DeliveryMethod.EMAIL),
                        key
                );
            }

        } catch (Exception ex) {
            log.warn("Notification failed for report {}: {}", reportId, ex.getMessage());
        }

        return mapper.toDTO(saved);
    }

// ============================================================
// ✅ HELPER METHODS - TENANT WORKFLOWS
// ============================================================

    private void verifyReportAsInternal(
            ObserverReport report,
            ObserverReportVerificationRequest req
    ) {
        report.setVerificationStatus(ObserverReportVerificationStatus.INTERNAL_VERIFIED);
        report.setVerifiedBy(getCurrentUserId());
        report.setVerifiedAt(LocalDateTime.now());
        report.setVerificationNote(req.getNote() != null ? req.getNote() : "Verified internally");

        report.setVisibility(ObserverReportVisibility.PRIVATE);
        report.setIsCritical(false);
    }

    private void escalateReportToNec(
            ObserverReport report,
            ObserverReportVerificationRequest req
    ) {
        if (req.getNote() == null || req.getNote().trim().isEmpty()) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Escalation reason/note is required"
            );
        }

        report.setVerificationStatus(ObserverReportVerificationStatus.UNDER_INVESTIGATION);
        report.setVerifiedBy(getCurrentUserId());
        report.setVerifiedAt(LocalDateTime.now());
        report.setVerificationNote(req.getNote());

        report.setVisibility(ObserverReportVisibility.SHARED);
        report.setIsCritical(true);
    }



    private void withdrawReportFromNec(
            ObserverReport report,
            ObserverReportVerificationRequest req
    ) {
        if (report.getVerificationStatus() != ObserverReportVerificationStatus.UNDER_INVESTIGATION) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Can only withdraw reports that are under investigation"
            );
        }

        report.setVerificationStatus(ObserverReportVerificationStatus.PENDING);
        report.setVerifiedBy(null);
        report.setVerifiedAt(null);
        report.setVerificationNote("Withdrawn from NEC escalation: " +
                (req.getNote() != null ? req.getNote() : "No reason provided"));

        report.setVisibility(ObserverReportVisibility.PRIVATE);
        report.setIsCritical(false);
    }




// ============================================================
// ✅ NEC VERIFYING OWN ORG (NEW HELPER)
// ============================================================

    /**
     * ✅ NEC verifies their own org report as NEC_VERIFIED
     * (NEC can also mark their own reports with NEC_VERIFIED status)
     */
    private void verifyReportAsNecOwn(
            ObserverReport report,
            ObserverReportVerificationRequest req
    ) {
        if (req.getNote() == null || req.getNote().trim().isEmpty()) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Verification notes are required"
            );
        }

        report.setVerificationStatus(ObserverReportVerificationStatus.NEC_VERIFIED);
        report.setVerifiedBy(getCurrentUserId());
        report.setVerifiedAt(LocalDateTime.now());
        report.setVerificationNote(req.getNote());

        // ✅ NEC can choose visibility for own report
        ObserverReportVisibility visibility = ObserverReportVisibility.PRIVATE;
        if (req.getVisibility() != null) {
            try {
                visibility = ObserverReportVisibility.valueOf(req.getVisibility());
            } catch (Exception ex) {
                throw new ResponseStatusException(BAD_REQUEST, "Invalid visibility level");
            }
        }
        report.setVisibility(visibility);
        report.setIsCritical(false); // Own org verification - not critical
    }



// ============================================================
// ✅ NEC VERIFYING OTHER ORG (EXISTING HELPERS)
// ============================================================

    /**
     * ✅ NEC verifies other org report (NEC authority)
     * Status: NEC_VERIFIED (LOCKED)
     * Visibility: SHARED or PUBLIC (default SHARED to retain NEC access)
     */
    private void verifyReportAsNec(
            ObserverReport report,
            ObserverReportVerificationRequest req
    ) {
        if (req.getNote() == null || req.getNote().trim().isEmpty()) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Investigation notes are required for NEC verification"
            );
        }

        // ✅ Default to SHARED (NEC keeps record), but allow PUBLIC if specified
        ObserverReportVisibility visibility = ObserverReportVisibility.SHARED;
        if (req.getVisibility() != null) {
            try {
                String vis = req.getVisibility().toUpperCase();
                // ✅ Only allow SHARED or PUBLIC for other org reports (never PRIVATE)
                if (vis.equals("PUBLIC")) {
                    visibility = ObserverReportVisibility.PUBLIC;
                } else if (!vis.equals("SHARED")) {
                    throw new ResponseStatusException(
                            BAD_REQUEST,
                            "For other org reports, only SHARED or PUBLIC visibility allowed"
                    );
                }
            } catch (Exception ex) {
                throw new ResponseStatusException(BAD_REQUEST, "Invalid visibility level");
            }
        }

        report.setVerificationStatus(ObserverReportVerificationStatus.NEC_VERIFIED);
        report.setVerifiedBy(getCurrentUserId());
        report.setVerifiedAt(LocalDateTime.now());
        report.setVerificationNote(req.getNote());
        report.setVisibility(visibility);
        report.setIsCritical(true); // Remains critical (was escalated)
    }

    private void rejectReport(
            ObserverReport report,
            ObserverReportVerificationRequest req
    ) {
        if (req.getNote() == null || req.getNote().trim().isEmpty()) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Rejection reason is required"
            );
        }

        report.setVerificationStatus(ObserverReportVerificationStatus.REJECTED);
        report.setVerifiedBy(getCurrentUserId());
        report.setVerifiedAt(LocalDateTime.now());
        report.setVerificationNote(req.getNote());

        report.setVisibility(ObserverReportVisibility.PRIVATE);
        report.setIsCritical(false);
    }

// ============================================================
// ✅ VALIDATION HELPERS
// ============================================================

    private void validateTenantVerification(
            ObserverReportVerificationStatus currentStatus,
            ObserverReportVerificationStatus newStatus
    ) {
        if (currentStatus == ObserverReportVerificationStatus.PENDING) {
            if (newStatus != ObserverReportVerificationStatus.INTERNAL_VERIFIED &&
                    newStatus != ObserverReportVerificationStatus.UNDER_INVESTIGATION &&
                    newStatus != ObserverReportVerificationStatus.NEC_VERIFIED) {
                throw new ResponseStatusException(
                        BAD_REQUEST,
                        "From PENDING, can verify to INTERNAL_VERIFIED, NEC_VERIFIED, or escalate to UNDER_INVESTIGATION"
                );
            }

        } else if (currentStatus == ObserverReportVerificationStatus.UNDER_INVESTIGATION) {
            if (newStatus != ObserverReportVerificationStatus.PENDING &&
                    newStatus != ObserverReportVerificationStatus.UNDER_INVESTIGATION) {
                throw new ResponseStatusException(
                        BAD_REQUEST,
                        "From UNDER_INVESTIGATION, can only withdraw to PENDING"
                );
            }

        } else if (currentStatus == ObserverReportVerificationStatus.REJECTED) {
            if (newStatus != ObserverReportVerificationStatus.UNDER_INVESTIGATION) {
                throw new ResponseStatusException(
                        BAD_REQUEST,
                        "From REJECTED, can only re-escalate to UNDER_INVESTIGATION"
                );
            }

        } else {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Cannot perform tenant action on report with status: " + currentStatus
            );
        }
    }

    private void validateNecVerification(
            ObserverReportVerificationStatus currentStatus,
            ObserverReportVerificationStatus newStatus
    ) {
        // ✅ NEC authority can ONLY verify UNDER_INVESTIGATION reports
        if (currentStatus != ObserverReportVerificationStatus.UNDER_INVESTIGATION) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "NEC can only verify reports in UNDER_INVESTIGATION status. Current status: " + currentStatus
            );
        }

        // NEC can only set to NEC_VERIFIED or REJECTED
        if (newStatus != ObserverReportVerificationStatus.NEC_VERIFIED &&
                newStatus != ObserverReportVerificationStatus.REJECTED) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "NEC can only set status to NEC_VERIFIED or REJECTED"
            );
        }
    }

    private UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            return UUID.fromString(jwt.getSubject());
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
    }

    @Override
    @Transactional(readOnly = true)
    public ObserverReportDto get(UUID reportId) {
        return repo.findById(reportId).map(mapper::toDTO)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Report not found"));
    }



    @Override
    @Transactional(readOnly = true)
    public List<ObserverReportDto> near(UUID orgId, double lat, double lon, double meters) {
        return repo.findNear(orgId, lon, lat, meters).stream().map(mapper::toDTO).toList();
    }


    private String buildReportMessage(ObserverReport r, PollingCenter center) {
        String where = (center != null)
                ? center.getCenterName()
                : (r.getCounty() != null ? r.getCounty().getCountyName() : "unspecified location");
        return "Report type: " + r.getType() + " at " + where + ".";
    }

    private void notify(UUID orgId, UUID userId,
                        NotificationType type, String title, String message,
                        String relatedTable, UUID relatedId,
                        NotificationPriority priority,
                        Set<DeliveryMethod> channels,
                        String idempotencyKey) {

        NotificationCreateRequest req = NotificationCreateRequest.builder()
                .orgId(orgId)
                .userId(userId)
                .type(type)
                .title(title)
                .message(message)
                .relatedTable(relatedTable)
                .relatedId(relatedId)
                .priority(priority != null ? priority : NotificationPriority.NORMAL)
                .channels((channels == null || channels.isEmpty())
                        ? EnumSet.of(DeliveryMethod.IN_APP)
                        : EnumSet.copyOf(channels))
                .idempotencyKey(idempotencyKey)
                .build();

        notificationService.publish(req);
    }

}