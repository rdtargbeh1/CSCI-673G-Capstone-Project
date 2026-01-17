package election.ems_backend.service;

/**
 * Thrown when an advisory lock cannot be acquired and the operation should be retried later.
 */
public class AdvisoryLockNotAcquiredException extends RuntimeException {
    public AdvisoryLockNotAcquiredException() { super(); }
    public AdvisoryLockNotAcquiredException(String message) { super(message); }
    public AdvisoryLockNotAcquiredException(String message, Throwable cause) { super(message, cause); }
}