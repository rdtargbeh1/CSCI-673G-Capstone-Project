 package election.ems_backend.repository;

import election.ems_backend.entity.AuditLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AuditLedgerRepository extends JpaRepository<AuditLedger, UUID> {
    Optional<AuditLedger> findTopByOrderByCreatedAtDesc();
    List<AuditLedger> findByEntryReference(UUID entryReference);
    List<AuditLedger> findByEntryTypeOrderByCreatedAtAsc(String entryType);
    List<AuditLedger> findAllByOrderByCreatedAtAsc();


}