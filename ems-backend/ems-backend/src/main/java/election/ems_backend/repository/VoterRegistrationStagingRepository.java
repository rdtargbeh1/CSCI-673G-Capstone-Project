package election.ems_backend.repository;

import election.ems_backend.entity.VoterRegistrationStaging;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface VoterRegistrationStagingRepository extends JpaRepository<VoterRegistrationStaging, UUID> {
    List<VoterRegistrationStaging> findByBatchId(UUID batchId);
    List<VoterRegistrationStaging> findByValidatedFalseAndProcessedFalse();
    List<VoterRegistrationStaging> findByProcessedFalseAndValidatedTrue();

    List<VoterRegistrationStaging> findByBatchIdAndValidatedFalse(UUID batchId);

    List<VoterRegistrationStaging> findByBatchIdAndValidatedTrue(UUID batchId);

    List<VoterRegistrationStaging> findByBatchIdAndValidatedTrueAndProcessedFalse(UUID batchId);

    List<VoterRegistrationStaging> findByBatchIdAndProcessedTrue(UUID batchId);

    Page<VoterRegistrationStaging> findByBatchIdAndValidatedTrueAndProcessedFalse(UUID batchId, Pageable pageable);

    // Batch-scoped counts (Overview-style)
    long countByBatchId(UUID batchId);

    long countByBatchIdAndValidatedFalse(UUID batchId);

    long countByBatchIdAndValidatedTrue(UUID batchId);

    long countByBatchIdAndValidatedTrueAndProcessedFalse(UUID batchId);
}