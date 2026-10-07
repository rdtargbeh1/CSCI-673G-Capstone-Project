package election.ems_backend.repository;

import election.ems_backend.entity.VoteSubmissionRanking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VoteSubmissionRankingRepository extends JpaRepository<VoteSubmissionRanking, UUID> {

    List<VoteSubmissionRanking> findBySubmissionId(UUID submissionId);
    List<VoteSubmissionRanking> findByContestId(UUID contestId);

    Optional<VoteSubmissionRanking> findBySubmissionIdAndContestId(UUID submissionId, UUID contestId);

    void deleteBySubmissionId(UUID submissionId);


    @Modifying
    @Query("delete from VoteSubmissionRanking r where r.submissionId = :submissionId and r.contestId = :contestId")
    int deleteBySubmissionIdAndContestId(@Param("submissionId") UUID submissionId,
                                         @Param("contestId") UUID contestId);


}
