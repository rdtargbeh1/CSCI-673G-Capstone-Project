package election.ems_backend.utility;

import election.ems_backend.enums.ActivityType;
import election.ems_backend.service.AdvisoryLockNotAcquiredException;
import election.ems_backend.service.AuditLogService;
import election.ems_backend.service.VoteTallyService;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ScheduledFuture;

/**
 * Listens for RecomputeEvent AFTER_COMMIT and runs vote tally recompute asynchronously.
 *
 * Behavior:
 *  - Runs async so verify() returns quickly.
 *  - Retries a configurable number of times with exponential backoff if recompute returns empty due to advisory lock.
 *  - On repeated failure logs, emits metrics, and records a lightweight audit entry via AuditLogService.
 */
@Component
public class RecomputeListener {

    private static final Logger log = LoggerFactory.getLogger(RecomputeListener.class);

    private final VoteTallyService voteTallyService;
    private final AuditLogService auditLogService;
    private final MeterRegistry meterRegistry;
    private final TaskScheduler scheduler;

    // config: retry attempts and base delay
    private static final int MAX_RETRIES = 5;
    private static final Duration BASE_DELAY = Duration.ofSeconds(2);


    public RecomputeListener(VoteTallyService voteTallyService,
                             AuditLogService auditLogService,
                             MeterRegistry meterRegistry) {
        this.voteTallyService = voteTallyService;
        this.auditLogService = auditLogService;
        this.meterRegistry = meterRegistry;

        // simple scheduler used for delayed retries; uses small pool
        ThreadPoolTaskScheduler ts = new ThreadPoolTaskScheduler();
        ts.setPoolSize(2);
        ts.setThreadNamePrefix("recompute-retry-");
        ts.initialize();
        this.scheduler = ts;
    }

    @Async("voteExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onRecomputeEvent(RecomputeEvent ev) {
        final String key = ev.getOrgId() + ":" + ev.getElectionId();
        log.info("Received RecomputeEvent for {}", key);
        meterRegistry.counter("recompute.events.received").increment();

        try {
            boolean success = tryRunWithRetries(ev.getOrgId(), ev.getElectionId(), ev.getActorUserId(), 0);
            if (!success) {
                meterRegistry.counter("recompute.events.failed").increment();
                auditLogService.log(
                        ev.getOrgId(),
                        ev.getActorUserId(),
                        ActivityType.TALLY_RECOMPUTE,
                        "VoteTally",
                        "Automated recompute failed after retries for election: " + ev.getElectionId()
                );
                log.error("Recompute for {} failed after retries", key);
            } else {
                meterRegistry.counter("recompute.events.succeeded").increment();
                log.info("Recompute for {} completed", key);
            }
        } catch (Exception ex) {
            meterRegistry.counter("recompute.events.failed").increment();
            log.error("Unexpected error while processing recompute event for {}: {}", key, ex.getMessage(), ex);
            auditLogService.log(
                    ev.getOrgId(),
                    ev.getActorUserId(),
                    ActivityType.TALLY_RECOMPUTE,
                    "VoteTally",
                    "Recompute failed with unexpected error: " + ex.getMessage()
            );
        }
    }

    /**
     * Attempts recompute. Returns true if a run completed successfully (even if it produced zero tallies
     * because there truly are no VERIFIED submissions). Returns false if a retry was scheduled or all
     * retries failed.
     *
     * attempt = 0 is the first immediate attempt. We allow up to MAX_RETRIES attempts (0 .. MAX_RETRIES-1).
     */
    private boolean tryRunWithRetries(UUID orgId, UUID electionId, UUID actorUserId, int attempt) {
        log.debug("Recompute attempt #{}/{} for {}/{}", attempt + 1, MAX_RETRIES, orgId, electionId);

        try {
            List<?> result = voteTallyService.recomputeForElection(orgId, electionId, actorUserId);

            int count = result == null ? 0 : result.size();
            log.info("Recompute succeeded for org={} election={} produced {} tallies (attempt #{})",
                    orgId, electionId, count, attempt + 1);

            safelyLogAudit(orgId, actorUserId, ActivityType.TALLY_RECOMPUTE, "VoteTally",
                    "Recompute succeeded for election " + electionId + " produced " + count + " tallies");

            return true;
        } catch (AdvisoryLockNotAcquiredException lockEx) {
            if (attempt >= MAX_RETRIES - 1) {
                log.error("Recompute for {}/{} could not acquire advisory lock after {} attempts",
                        orgId, electionId, MAX_RETRIES);
                return false;
            }
            long delayMillis = computeBackoffMillis(attempt);
            log.warn("Advisory lock not acquired for {}/{}; scheduling retry #{} after {}ms",
                    orgId, electionId, attempt + 2, delayMillis);
            scheduleRetry(orgId, electionId, actorUserId, attempt + 1, delayMillis);
            return false;
        } catch (Exception ex) {
            if (attempt >= MAX_RETRIES - 1) {
                log.error("Recompute for {}/{} failed after {} attempts: {}",
                        orgId, electionId, MAX_RETRIES, ex.getMessage(), ex);

                safelyLogAudit(orgId, actorUserId, ActivityType.TALLY_RECOMPUTE, "VoteTally",
                        "Recompute failed with error: " + ex.getMessage());

                return false;
            } else {
                long delayMillis = computeBackoffMillis(attempt);
                log.warn("Recompute attempt #{} for {}/{} failed: {}. Retrying in {}ms",
                        attempt + 1, orgId, electionId, ex.getMessage(), delayMillis);
                scheduleRetry(orgId, electionId, actorUserId, attempt + 1, delayMillis);
                return false;
            }
        }
    }

    private void safelyLogAudit(UUID orgId, UUID actorUserId, ActivityType type,
                                String entity, String description) {
        try {
            auditLogService.log(orgId, actorUserId, type, entity, description);
        } catch (Exception e) {
            log.error("Failed to write audit log for recompute: {}", e.getMessage(), e);
        }
    }



    private void scheduleRetry(java.util.UUID orgId, java.util.UUID electionId, java.util.UUID actorUserId, int nextAttempt, long delayMs) {
        Instant runAt = Instant.now().plusMillis(delayMs);
        scheduler.schedule(() -> {
            tryRunWithRetries(orgId, electionId, actorUserId, nextAttempt);
        }, runAt);
    }

    private long computeBackoffMillis(int attempt) {
        long base = BASE_DELAY.toMillis() * (1L << Math.min(attempt, 10));
        long jitter = (long) (Math.random() * 200L);
        return Math.min(base + jitter, Duration.ofMinutes(5).toMillis());
    }


}