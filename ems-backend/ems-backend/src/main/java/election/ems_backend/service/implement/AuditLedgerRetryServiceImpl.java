package election.ems_backend.service.implement;

import election.ems_backend.dto.AuditLedgerRetryDto;
import election.ems_backend.entity.AuditLedgerRetry;
import election.ems_backend.enums.AuditLedgerStatus;
import election.ems_backend.mapper.AuditLedgerRetryMapper;
import election.ems_backend.repository.AuditLedgerRetryRepository;
import election.ems_backend.service.AuditLedgerRetryService;
import election.ems_backend.service.AuditLedgerService;
import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Final, claim-safe implementation of AuditLedgerRetry processing.
 *
 * - Claims a batch using the DB function claim_retry_batch(:limit, :worker) which uses FOR UPDATE SKIP LOCKED.
 * - Processes each claimed item in its own transaction (TransactionTemplate) so append attempts
 *   don't hold DB locks longer than necessary.
 * - On success calls mark_retry_success(retry_id) (DB function deletes the row).
 * - On failure calls mark_retry_failed(retry_id, error, baseBackoff, maxBackoff).
 */
@Service
@RequiredArgsConstructor
public class AuditLedgerRetryServiceImpl implements AuditLedgerRetryService {

    private static final Logger log = LoggerFactory.getLogger(AuditLedgerRetryServiceImpl.class);

    private final AuditLedgerRetryRepository retryRepo;
    private final AuditLedgerService ledgerService;
    private final EntityManager em;
    private final PlatformTransactionManager txManager;

    // Configurable properties (defaults preserved)
    @Value("${audit.ledger.retry.batch-size:50}")
    private int batchSize;

    @Value("${audit.ledger.retry.base-backoff-seconds:30}")
    private int baseBackoffSeconds;

    @Value("${audit.ledger.retry.max-backoff-seconds:86400}")
    private int maxBackoffSeconds;

    @Value("${audit.ledger.retry.max-attempts:10}")
    private int maxAttempts;

    private TransactionTemplate txTemplate;

    @PostConstruct
    private void init() {
        this.txTemplate = new TransactionTemplate(txManager);
    }

    @Override
    public void enqueueRetry(String entryType, UUID entryReference, String payload, UUID actorId, String signature, String error) {
        AuditLedgerRetry r = new AuditLedgerRetry();
        r.setEntryType(entryType);
        r.setEntryReference(entryReference);
        r.setPayload(payload);
        r.setActorId(actorId);
        r.setSignature(signature);
        r.setLastError(truncate(error, 2000));
        r.setAttempts(1);
        r.setNextAttemptAt(LocalDateTime.now().plusSeconds(baseBackoffSeconds));
        r.setStatus(AuditLedgerStatus.PENDING);
        retryRepo.save(r);
        log.info("Enqueued audit ledger retry for entryRef={} retryId={}", entryReference, r.getRetryId());
    }

    @SuppressWarnings("unchecked")
    @Override
    public int processPendingRetries() {
        UUID workerId = UUID.randomUUID();
        Query q = em.createNativeQuery("SELECT * FROM claim_retry_batch(:limit, :worker)", AuditLedgerRetry.class)
                .setParameter("limit", batchSize)
                .setParameter("worker", workerId);
        List<AuditLedgerRetry> items = (List<AuditLedgerRetry>) q.getResultList();

        if (items == null || items.isEmpty()) {
            return 0;
        }

        int processed = 0;
        for (AuditLedgerRetry item : items) {
            try {
                txTemplate.executeWithoutResult(status -> {
                    try {
                        ledgerService.appendEntry(item.getEntryType(), item.getEntryReference(), item.getPayload(),
                                item.getActorId(), item.getSignature());
                        // success -> mark success (deletes the retry row)
                        em.createNativeQuery("SELECT mark_retry_success(:id)")
                                .setParameter("id", item.getRetryId())
                                .getSingleResult();
                        log.info("Successfully retried audit ledger entry retryId={}", item.getRetryId());
                    } catch (Exception ex) {
                        String err = truncate(ex.getMessage() == null ? ex.toString() : ex.getMessage(), 2000);
                        // increment attempts and schedule next attempt via DB function
                        em.createNativeQuery("SELECT mark_retry_failed(:id, :err, :base, :max)")
                                .setParameter("id", item.getRetryId())
                                .setParameter("err", err)
                                .setParameter("base", baseBackoffSeconds)
                                .setParameter("max", maxBackoffSeconds)
                                .getSingleResult();
                        log.warn("Retry attempt failed for retryId={} err={}", item.getRetryId(), err);
                    }
                });
                processed++;
            } catch (Exception outer) {
                // Defensive: log and continue with next item
                log.error("Unexpected error processing retryId={} : {}", item.getRetryId(), outer.getMessage(), outer);
            }
        }

        return processed;
    }

    @SuppressWarnings("unchecked")
    @Override
    public void processSingle(UUID retryId) {
        // Try to claim one item first
        UUID workerId = UUID.randomUUID();
        Query q = em.createNativeQuery("SELECT * FROM claim_retry_batch(1, :worker)", AuditLedgerRetry.class)
                .setParameter("worker", workerId);
        List<AuditLedgerRetry> items = (List<AuditLedgerRetry>) q.getResultList();

        AuditLedgerRetry target = null;
        if (items != null && !items.isEmpty()) {
            target = items.get(0);
        }

        if (target == null || !target.getRetryId().equals(retryId)) {
            // Not claimed or different item; fetch directly and process in its own transaction
            AuditLedgerRetry item = retryRepo.findById(retryId).orElseThrow(() -> new IllegalArgumentException("Retry item not found"));
            try {
                txTemplate.executeWithoutResult(status -> {
                    try {
                        ledgerService.appendEntry(item.getEntryType(), item.getEntryReference(), item.getPayload(),
                                item.getActorId(), item.getSignature());
                        em.createNativeQuery("SELECT mark_retry_success(:id)").setParameter("id", item.getRetryId()).getSingleResult();
                    } catch (Exception ex) {
                        String err = truncate(ex.getMessage() == null ? ex.toString() : ex.getMessage(), 2000);
                        em.createNativeQuery("SELECT mark_retry_failed(:id, :err, :base, :max)")
                                .setParameter("id", item.getRetryId())
                                .setParameter("err", err)
                                .setParameter("base", baseBackoffSeconds)
                                .setParameter("max", maxBackoffSeconds)
                                .getSingleResult();
                        throw new RuntimeException("Retry failed: " + err, ex);
                    }
                });
            } catch (RuntimeException rex) {
                throw rex;
            }
            return;
        }

        // Process the claimed target
        final AuditLedgerRetry claimedTarget = target;
        try {
            txTemplate.executeWithoutResult(status -> {
                try {
                    ledgerService.appendEntry(claimedTarget.getEntryType(), claimedTarget.getEntryReference(), claimedTarget.getPayload(),
                            claimedTarget.getActorId(), claimedTarget.getSignature());
                    em.createNativeQuery("SELECT mark_retry_success(:id)").setParameter("id", claimedTarget.getRetryId()).getSingleResult();
                } catch (Exception ex) {
                    String err = truncate(ex.getMessage() == null ? ex.toString() : ex.getMessage(), 2000);
                    em.createNativeQuery("SELECT mark_retry_failed(:id, :err, :base, :max)")
                            .setParameter("id", claimedTarget.getRetryId())
                            .setParameter("err", err)
                            .setParameter("base", baseBackoffSeconds)
                            .setParameter("max", maxBackoffSeconds)
                            .getSingleResult();
                    throw new RuntimeException("Retry failed: " + err, ex);
                }
            });
        } catch (RuntimeException rex) {
            throw rex;
        }
    }

    @Override
    public List<AuditLedgerRetryDto> listPending(int limit) {
        List<AuditLedgerRetry> items = em.createQuery(
                        "SELECT r FROM AuditLedgerRetry r WHERE r.status = :status AND r.nextAttemptAt <= :now ORDER BY r.attempts ASC, r.createdAt ASC",
                        AuditLedgerRetry.class)
                .setParameter("status", AuditLedgerStatus.PENDING)
                .setParameter("now", LocalDateTime.now())
                .setMaxResults(Math.max(10, limit))
                .getResultList();

        List<AuditLedgerRetryDto> out = new ArrayList<>();
        AuditLedgerRetryMapper mapper = new AuditLedgerRetryMapper();
        for (AuditLedgerRetry r : items) out.add(mapper.toDto(r));
        return out;
    }

    private static String truncate(String s, int max) {
        if (s == null) return null;
        if (s.length() <= max) return s;
        return s.substring(0, max);
    }

}


