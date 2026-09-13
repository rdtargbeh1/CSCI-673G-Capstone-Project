package election.ems_backend.mapper;

import election.ems_backend.dto.AuditLedgerDto;
import election.ems_backend.entity.AuditLedger;
import org.springframework.stereotype.Component;


@Component
public class AuditLedgerMapper {

    public AuditLedgerDto toDTO(AuditLedger auditLedger){
        if (auditLedger == null) return null;

        AuditLedgerDto dto = new AuditLedgerDto();
        dto.setLedgerId(auditLedger.getLedgerId());
        dto.setEntryType(auditLedger.getEntryType());
        dto.setEntryReference(auditLedger.getEntryReference());
        dto.setPayloadHash(auditLedger.getPayloadHash());
        dto.setChainHash(auditLedger.getChainHash());
        dto.setActorId(auditLedger.getActorId());
        dto.setSignature(auditLedger.getSignature());
        dto.setCreatedAt(auditLedger.getCreatedAt());

        return dto;
    }


    public AuditLedger fromDto(AuditLedgerDto d) {
        if (d == null) return null;
        AuditLedger a = new AuditLedger();
        a.setLedgerId(d.getLedgerId());
        a.setEntryType(d.getEntryType());
        a.setEntryReference(d.getEntryReference());
        a.setPayloadHash(d.getPayloadHash());
        a.setPrevHash(d.getPrevHash());
        a.setChainHash(d.getChainHash());
        a.setActorId(d.getActorId());
        a.setSignature(d.getSignature());
        a.setCreatedAt(d.getCreatedAt());
        return a;
    }

}
