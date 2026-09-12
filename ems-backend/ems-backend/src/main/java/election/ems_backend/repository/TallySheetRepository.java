package election.ems_backend.repository;

import election.ems_backend.entity.TallySheet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TallySheetRepository extends JpaRepository<TallySheet, UUID> {

    List<TallySheet> findBySubmission_SubmissionIdOrderByDateUploadedDesc(
            UUID submissionId
    );

    // Used by submission list/search so evidence can be loaded
    // for the entire page with one database query.
    List<TallySheet> findBySubmission_SubmissionIdIn(
            List<UUID> submissionIds
    );

    @Query("""
            select count(t) > 0
            from TallySheet t
            where t.submission.submissionId = :submissionId
              and t.fileSha256 = :sha
            """)
    boolean existsBySubmissionAndSha(
            @Param("submissionId") UUID submissionId,
            @Param("sha") String sha
    );

    /**
     * Evidence policy: Check if a tally sheet exists for a submission
     * within an organization.
     */
    boolean existsByOrganization_OrgIdAndSubmission_SubmissionId(
            UUID orgId,
            UUID submissionId
    );

    /**
     * Fetch tally sheet by organization + submission.
     */
    Optional<TallySheet> findByOrganization_OrgIdAndSubmission_SubmissionId(
            UUID orgId,
            UUID submissionId
    );
}