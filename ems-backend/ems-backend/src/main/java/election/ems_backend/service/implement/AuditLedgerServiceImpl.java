package election.ems_backend.service.implement;

import election.ems_backend.dto.AuditLedgerDto;
import election.ems_backend.entity.AuditLedger;
import election.ems_backend.mapper.AuditLedgerMapper;
import election.ems_backend.repository.AuditLedgerRepository;
import election.ems_backend.service.AuditLedgerService;
import election.ems_backend.utility.HashUtil;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Implementation notes:
 * - Uses Postgres advisory lock to serialize chain-appends (pg_advisory_xact_lock with hashtext key).
 * - payloadHash = sha256(payloadString)
 * - chainHash = sha256((prevHash != null ? prevHash : "") + ":" + payloadHash)
 *
 * This creates a tamper-evident linked chain of hashes.
 */
@Service
@RequiredArgsConstructor
public class AuditLedgerServiceImpl implements AuditLedgerService {

    private static final Logger log = LoggerFactory.getLogger(AuditLedgerServiceImpl.class);
//    private final org.slf4j.Logger logger = LoggerFactory.getLogger(AuditLedgerServiceImpl.class);

    private final AuditLedgerRepository repo;
    private final EntityManager em;

    // advisory lock key name — keep stable
    private static final String ADVISORY_LOCK_NAME = "audit_ledger";


    @Override
    @Transactional
    public AuditLedgerDto appendEntry(String entryType, UUID entryReference, String payload, UUID actorId, String signature) {
        // Acquire advisory lock
        try {
            em.createNativeQuery("SELECT pg_advisory_xact_lock(hashtext(:name))")
                    .setParameter("name", "audit_ledger")
                    .getSingleResult();
        } catch (Exception ex) {
            log.warn("Failed to acquire advisory lock for audit_ledger: {}", ex.getMessage());
        }

        String payloadHash = HashUtil.sha256Hex(payload == null ? "" : payload);

        Optional<AuditLedger> lastOpt = repo.findTopByOrderByCreatedAtDesc();
        String prevHash = lastOpt.map(AuditLedger::getChainHash).orElse(null);

        String chainInput = (prevHash == null ? "" : prevHash) + ":" + payloadHash;
        String chainHash = HashUtil.sha256Hex(chainInput);

        AuditLedger e = new AuditLedger();
        e.setLedgerId(UUID.randomUUID());
        e.setEntryType(entryType);
        e.setEntryReference(entryReference);
        e.setPayloadHash(payloadHash);
        e.setPrevHash(prevHash);
        e.setChainHash(chainHash);
        e.setActorId(actorId);
        e.setSignature(signature);

        AuditLedger saved = repo.save(e);
        AuditLedgerDto d = new AuditLedgerDto();
        d.setLedgerId(saved.getLedgerId());
        d.setEntryType(saved.getEntryType());
        d.setEntryReference(saved.getEntryReference());
        d.setPayloadHash(saved.getPayloadHash());
        d.setPrevHash(saved.getPrevHash());
        d.setChainHash(saved.getChainHash());
        d.setActorId(saved.getActorId());
        d.setSignature(saved.getSignature());
        d.setCreatedAt(saved.getCreatedAt());
        return d;
    }


    @Override
    @Transactional(readOnly = true)
    public Optional<AuditLedgerDto> getLatest() {
        return repo.findTopByOrderByCreatedAtDesc().map(a -> {
            AuditLedgerDto d = new AuditLedgerDto();
            d.setLedgerId(a.getLedgerId());
            d.setEntryType(a.getEntryType());
            d.setEntryReference(a.getEntryReference());
            d.setPayloadHash(a.getPayloadHash());
            d.setPrevHash(a.getPrevHash());
            d.setChainHash(a.getChainHash());
            d.setActorId(a.getActorId());
            d.setSignature(a.getSignature());
            d.setCreatedAt(a.getCreatedAt());
            return d;
        });
    }


    @Override
    @Transactional(readOnly = true)
    public List<AuditLedgerDto> listByEntryReference(UUID entryReference) {
        List<AuditLedger> rows = repo.findByEntryReference(entryReference);
        List<AuditLedgerDto> out = new ArrayList<>(rows.size());
        rows.forEach(r -> out.add(new AuditLedgerMapper().toDTO(r)));
        return out;
    }


    @Override
    @Transactional(readOnly = true)
    public List<AuditLedgerDto> listByEntryType(String entryType) {
        List<AuditLedger> rows = repo.findByEntryTypeOrderByCreatedAtAsc(entryType);
        List<AuditLedgerDto> out = new ArrayList<>(rows.size());
        rows.forEach(r -> out.add(new AuditLedgerMapper().toDTO(r)));
        return out;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditLedgerDto> listAll() {
        List<AuditLedger> rows = repo.findAllByOrderByCreatedAtAsc();
        List<AuditLedgerDto> out = new ArrayList<>(rows.size());
        rows.forEach(r -> out.add(new AuditLedgerMapper().toDTO(r)));
        return out;
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> verifyLedgerChain() {
        List<AuditLedger> rows = repo.findAllByOrderByCreatedAtAsc();
        List<String> errors = new ArrayList<>();
        String computedPrev = null;
        int idx = 0;
        for (AuditLedger row : rows) {
            idx++;
            String rowPrev = row.getPrevHash();
            if ((computedPrev == null && rowPrev != null) || (computedPrev != null && !computedPrev.equals(rowPrev))) {
                errors.add(String.format("Row %d ledger_id=%s: prev_hash mismatch (expected=%s actual=%s)", idx, row.getLedgerId(), computedPrev, rowPrev));
            }
            String recomputed = HashUtil.sha256Hex((rowPrev == null ? "" : rowPrev) + ":" + row.getPayloadHash());
            if (!recomputed.equals(row.getChainHash())) {
                errors.add(String.format("Row %d ledger_id=%s: chain_hash invalid", idx, row.getLedgerId()));
            }
            computedPrev = row.getChainHash();
        }
        return errors;
    }



}