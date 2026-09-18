package election.ems_backend.repository;

import election.ems_backend.entity.Discrepancy;
import election.ems_backend.enums.DiscrepancyStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DiscrepancyRepository extends JpaRepository<Discrepancy, UUID>, JpaSpecificationExecutor<Discrepancy> {

    Optional<Discrepancy> findByElection_ElectionIdAndPollingCenter_CenterIdAndOrganization_OrgId(
            UUID electionId, UUID centerId, UUID orgId);

    // for OPEN discrepancies (any org)
    List<Discrepancy> findByElection_ElectionIdAndStatus(UUID electionId, DiscrepancyStatus status);

    /**
     * Integrity Summary: Count OPEN discrepancies for an election.
     * ✅ Used by Overview -> "Open discrepancies"
     *
     * @param electionId election scope
     * @param status usually DiscrepancyStatus.OPEN
     * @return count of discrepancies by status
     */
    long countByElection_ElectionIdAndStatus(UUID electionId, DiscrepancyStatus status);


    List<Discrepancy> findByVoteSubmission_SubmissionId(UUID submissionId);

    long countByVoteSubmission_SubmissionIdAndStatus(UUID submissionId, DiscrepancyStatus status);


}
