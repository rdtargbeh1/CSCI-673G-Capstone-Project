package election.ems_backend.repository;

import election.ems_backend.entity.AuditLedgerRetry;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLedgerRetryRepository extends JpaRepository<AuditLedgerRetry, UUID> {
    List<AuditLedgerRetry> findByNextAttemptAtBeforeOrderByAttemptsAscCreatedAt(LocalDateTime time, Pageable pageable);
}