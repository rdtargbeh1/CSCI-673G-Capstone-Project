package election.ems_backend.mapper;

import election.ems_backend.dto.AuditLedgerRetryDto;
import election.ems_backend.entity.AuditLedgerRetry;
import org.springframework.stereotype.Component;

@Component
public class AuditLedgerRetryMapper {

    public AuditLedgerRetryDto toDto(AuditLedgerRetry r) {
        if (r == null) return null;
        AuditLedgerRetryDto d = new AuditLedgerRetryDto();
        d.setRetryId(r.getRetryId());
        d.setEntryType(r.getEntryType());
        d.setEntryReference(r.getEntryReference());
        d.setPayload(r.getPayload());
        d.setActorId(r.getActorId());
        d.setSignature(r.getSignature());
        d.setLastError(r.getLastError());
        d.setAttempts(r.getAttempts());
        d.setNextAttemptAt(r.getNextAttemptAt());
        d.setCreatedAt(r.getCreatedAt());
        return d;
    }


    public AuditLedgerRetry fromDto(AuditLedgerRetryDto d) {
        if (d == null) return null;
        AuditLedgerRetry r = new AuditLedgerRetry();
        r.setRetryId(d.getRetryId());
        r.setEntryType(d.getEntryType());
        r.setEntryReference(d.getEntryReference());
        r.setPayload(d.getPayload());
        r.setActorId(d.getActorId());
        r.setSignature(d.getSignature());
        r.setLastError(d.getLastError());
        r.setAttempts(d.getAttempts());
        r.setNextAttemptAt(d.getNextAttemptAt());
        r.setCreatedAt(d.getCreatedAt());
        return r;
    }
}