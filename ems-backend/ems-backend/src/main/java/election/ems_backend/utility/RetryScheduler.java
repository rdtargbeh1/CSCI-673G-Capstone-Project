package election.ems_backend.utility;

import election.ems_backend.service.implement.AuditLedgerRetryServiceImpl;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Lightweight scheduler that triggers the AuditLedgerRetryService periodically.
 */
@Component
@RequiredArgsConstructor
public class RetryScheduler {

    private static final Logger log = LoggerFactory.getLogger(RetryScheduler.class);

    private final AuditLedgerRetryServiceImpl retryService;

    // Run every 60s (configurable via property improvements if desired)
    @Scheduled(fixedDelayString = "${audit.ledger.retry.interval.ms:60000}")
    public void run() {
        try {
            int processed = retryService.processPendingRetries();
            if (processed > 0) {
                log.info("Processed {} audit ledger retries", processed);
            }
        } catch (Exception ex) {
            log.error("Audit ledger retry scheduler encountered an error: {}", ex.getMessage());
        }
    }
}