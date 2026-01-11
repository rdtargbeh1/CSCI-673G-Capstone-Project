package election.ems_backend.enums;

public enum ActivityType {

    // Authentication
    LOGIN,
    LOGOUT,
    PASSWORD_CHANGE,
    PASSWORD_RESET,
    FAILED_LOGIN,

    // Generic CRUD
    CREATE,
    READ,
    UPDATE,
    DELETE,

    // Workflow
    APPROVE,
    REJECT,
    VERIFY,
    UNVERIFY,
    SUBMIT,
    RESUBMIT,

    // Submissions
    SUBMISSION_CREATE,
    SUBMISSION_UPDATE,
    SUBMISSION_VERIFY,
    SUBMISSION_REJECT,
    TALLY_UPLOAD,
    VOTE_FLAGGED,
    VOTE_UNFLAGGED,

    // Observer reports
    OBSERVER_REPORT_CREATE,
    OBSERVER_REPORT_RESOLVE,

    // User Management
    USER_CREATE,
    USER_UPDATE,
    USER_DISABLE,
    USER_ENABLE,
    USER_DELETE,
    USER_PROFILE_UPLOAD,
    USER_PROFILE_DELETE,

    // Organization & membership
    ORG_CREATE,
    ORG_UPDATE,
    ORG_DISABLE,
    ORG_ENABLE,
    MEMBERSHIP_ADD,
    MEMBERSHIP_REMOVE,

    // System / Settings
    SETTINGS_UPDATE,
    SYSTEM_CONFIG_UPDATE,
    ROLE_UPDATE,
    PERMISSION_UPDATE,

    // Files / Attachments
    UPLOAD,
    UPLOAD_PROFILE_PHOTO,
    UPLOAD_TALLY_SHEET,
    UPLOAD_ATTACHMENT,
    DOWNLOAD_ATTACHMENT,
    DELETE_ATTACHMENT,

    // Messaging
    MESSAGE_SEND,
    MESSAGE_DELETE,
    NOTIFICATION_SENT,
    NOTIFICATION_READ,

    // Export / Import
    EXPORT,
    IMPORT,

    // Geo / GPS
    LOCATION_UPDATE,
    GPS_CAPTURE,

    // System events
    SYSTEM_EVENT,
    SYSTEM_ERROR,


    // Vote tally recompute (new)
    TALLY_RECOMPUTE,

    OTHER
}

