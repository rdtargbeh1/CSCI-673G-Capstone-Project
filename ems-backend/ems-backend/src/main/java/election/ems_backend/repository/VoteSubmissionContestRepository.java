package election.ems_backend.repository;


import election.ems_backend.entity.VoteSubmissionContest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VoteSubmissionContestRepository extends JpaRepository<VoteSubmissionContest, UUID> {

    List<VoteSubmissionContest> findBySubmissionId(UUID submissionId);
    List<VoteSubmissionContest> findByElectionIdAndContestId(UUID electionId, UUID contestId);

    @Modifying
    @Query("delete from VoteSubmissionContest v where v.submissionId = :submissionId")
    int deleteBySubmissionId(@Param("submissionId") UUID submissionId);


    /**
     * Optional: Count contest-vote rows for a submission.
     * ✅ Works because entity has raw field submissionId (not relationship).
     */
    long countBySubmissionId(UUID submissionId);

    List<VoteSubmissionContest> findBySubmissionIdOrderByDateCreatedAsc(UUID submissionId);

    List<VoteSubmissionContest> findBySubmissionIdAndContestIdOrderByDateCreatedAsc(UUID submissionId, UUID contestId);

    @Query("""
        select v
        from VoteSubmissionContest v
        where v.submissionId = :submissionId
          and v.contestId = :contestId
          and v.optionId = :optionId
          and coalesce(v.rank, 0) = coalesce(:rank, 0)
    """)
    Optional<VoteSubmissionContest> findUnique(
            @Param("submissionId") UUID submissionId,
            @Param("contestId") UUID contestId,
            @Param("optionId") UUID optionId,
            @Param("rank") Integer rank
    );

    @Modifying
    @Query("""
        delete from VoteSubmissionContest v
        where v.submissionId = :submissionId
          and v.contestId = :contestId
    """)
    int deleteBySubmissionAndContest(@Param("submissionId") UUID submissionId,
                                     @Param("contestId") UUID contestId);

    List<VoteSubmissionContest> findBySubmissionIdAndContestIdAndRankIsNotNullOrderByRankAsc(
            UUID submissionId, UUID contestId
    );

}