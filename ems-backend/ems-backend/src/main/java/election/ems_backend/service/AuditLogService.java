package election.ems_backend.service;

import java.time.LocalDateTime;
import java.util.UUID;


import election.ems_backend.dto.AuditLogDto;
import election.ems_backend.enums.ActivityType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;


public interface AuditLogService {

    // ------------------------------------------------------
    // Core writer
    // ------------------------------------------------------
    AuditLogDto log(UUID orgId,
                    UUID userId,
                    ActivityType type,
                    String entity,
                    String description);

    // ------------------------------------------------------
    // Authentication
    // ------------------------------------------------------
    default AuditLogDto logLogin(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.LOGIN, entity, description);
    }

    default AuditLogDto logLogout(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.LOGOUT, entity, description);
    }

    default AuditLogDto logPasswordChange(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.PASSWORD_CHANGE, entity, description);
    }

    default AuditLogDto logPasswordReset(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.PASSWORD_RESET, entity, description);
    }

    default AuditLogDto logFailedLogin(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.FAILED_LOGIN, entity, description);
    }

    // ------------------------------------------------------
    // Generic CRUD
    // ------------------------------------------------------
    default AuditLogDto logCreate(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.CREATE, entity, description);
    }

    default AuditLogDto logRead(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.READ, entity, description);
    }

    default AuditLogDto logUpdate(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.UPDATE, entity, description);
    }

    default AuditLogDto logDelete(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.DELETE, entity, description);
    }

    // ------------------------------------------------------
    // Workflow / review
    // ------------------------------------------------------
    default AuditLogDto logApprove(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.APPROVE, entity, description);
    }

    default AuditLogDto logReject(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.REJECT, entity, description);
    }

    default AuditLogDto logVerify(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.VERIFY, entity, description);
    }

    default AuditLogDto logUnverify(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.UNVERIFY, entity, description);
    }

    default AuditLogDto logSubmit(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.SUBMIT, entity, description);
    }

    default AuditLogDto logResubmit(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.RESUBMIT, entity, description);
    }

    // ------------------------------------------------------
    // Submissions / tallies
    // ------------------------------------------------------
    default AuditLogDto logSubmissionCreate(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.SUBMISSION_CREATE, entity, description);
    }

    default AuditLogDto logSubmissionUpdate(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.SUBMISSION_UPDATE, entity, description);
    }

    default AuditLogDto logSubmissionVerify(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.SUBMISSION_VERIFY, entity, description);
    }

    default AuditLogDto logSubmissionReject(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.SUBMISSION_REJECT, entity, description);
    }

    default AuditLogDto logTallyUpload(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.TALLY_UPLOAD, entity, description);
    }

    // ------------------------------------------------------
    // Observer reports
    // ------------------------------------------------------
    default AuditLogDto logObserverReportCreate(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.OBSERVER_REPORT_CREATE, entity, description);
    }

    default AuditLogDto logObserverReportResolve(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.OBSERVER_REPORT_RESOLVE, entity, description);
    }

    // ------------------------------------------------------
    // User management
    // ------------------------------------------------------
    default AuditLogDto logUserCreate(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.USER_CREATE, entity, description);
    }

    default AuditLogDto logUserUpdate(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.USER_UPDATE, entity, description);
    }

    default AuditLogDto logUserDisable(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.USER_DISABLE, entity, description);
    }

    default AuditLogDto logUserEnable(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.USER_ENABLE, entity, description);
    }

    default AuditLogDto logUserDelete(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.USER_DELETE, entity, description);
    }

    default AuditLogDto logUserProfileUpload(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.USER_PROFILE_UPLOAD, entity, description);
    }

    default AuditLogDto logUserProfileDelete(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.USER_PROFILE_DELETE, entity, description);
    }

    // ------------------------------------------------------
    // Organization / membership
    // ------------------------------------------------------
    default AuditLogDto logOrgCreate(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.ORG_CREATE, entity, description);
    }

    default AuditLogDto logOrgUpdate(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.ORG_UPDATE, entity, description);
    }

    default AuditLogDto logOrgDisable(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.ORG_DISABLE, entity, description);
    }

    default AuditLogDto logOrgEnable(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.ORG_ENABLE, entity, description);
    }

    default AuditLogDto logMembershipAdd(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.MEMBERSHIP_ADD, entity, description);
    }

    default AuditLogDto logMembershipRemove(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.MEMBERSHIP_REMOVE, entity, description);
    }

    // ------------------------------------------------------
    // Settings / permissions / system config
    // ------------------------------------------------------
    default AuditLogDto logSettingsUpdate(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.SETTINGS_UPDATE, entity, description);
    }

    default AuditLogDto logSystemConfigUpdate(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.SYSTEM_CONFIG_UPDATE, entity, description);
    }

    default AuditLogDto logRoleUpdate(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.ROLE_UPDATE, entity, description);
    }

    default AuditLogDto logPermissionUpdate(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.PERMISSION_UPDATE, entity, description);
    }

    // ------------------------------------------------------
    // Files / attachments
    // ------------------------------------------------------
    default AuditLogDto logUpload(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.UPLOAD, entity, description);
    }

    default AuditLogDto logUploadProfilePhoto(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.UPLOAD_PROFILE_PHOTO, entity, description);
    }

    default AuditLogDto logUploadTallySheet(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.UPLOAD_TALLY_SHEET, entity, description);
    }

    default AuditLogDto logUploadAttachment(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.UPLOAD_ATTACHMENT, entity, description);
    }

    default AuditLogDto logDownloadAttachment(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.DOWNLOAD_ATTACHMENT, entity, description);
    }

    default AuditLogDto logDeleteAttachment(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.DELETE_ATTACHMENT, entity, description);
    }

    // ------------------------------------------------------
    // Messaging / notifications
    // ------------------------------------------------------
    default AuditLogDto logMessageSend(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.MESSAGE_SEND, entity, description);
    }

    default AuditLogDto logMessageDelete(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.MESSAGE_DELETE, entity, description);
    }

    default AuditLogDto logNotificationSent(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.NOTIFICATION_SENT, entity, description);
    }

    default AuditLogDto logNotificationRead(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.NOTIFICATION_READ, entity, description);
    }

    // ------------------------------------------------------
    // Export / import
    // ------------------------------------------------------
    default AuditLogDto logExport(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.EXPORT, entity, description);
    }

    default AuditLogDto logImport(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.IMPORT, entity, description);
    }

    // ------------------------------------------------------
    // Geo / GPS
    // ------------------------------------------------------
    default AuditLogDto logLocationUpdate(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.LOCATION_UPDATE, entity, description);
    }

    default AuditLogDto logGpsCapture(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.GPS_CAPTURE, entity, description);
    }

    // ------------------------------------------------------
    // System events
    // ------------------------------------------------------
    default AuditLogDto logSystemEvent(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.SYSTEM_EVENT, entity, description);
    }

    default AuditLogDto logSystemError(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.SYSTEM_ERROR, entity, description);
    }

    // ------------------------------------------------------
    // Catch-all
    // ------------------------------------------------------
    default AuditLogDto logOther(UUID orgId, UUID userId, String entity, String description) {
        return log(orgId, userId, ActivityType.OTHER, entity, description);
    }

    // ------------------------------------------------------
    // Reader
    // ------------------------------------------------------
    Page<AuditLogDto> search(UUID orgId,
                             UUID userId,
                             ActivityType type,
                             LocalDateTime from,
                             LocalDateTime to,
                             String q,
                             Pageable pageable);
}


