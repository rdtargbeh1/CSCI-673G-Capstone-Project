package election.ems_backend.service;

import election.ems_backend.dto.VoteSubmissionRankingDto;

import java.util.List;
import java.util.UUID;

public interface VoteSubmissionRankingService  {

    VoteSubmissionRankingDto createOrUpdateRanking(VoteSubmissionRankingDto dto);

    VoteSubmissionRankingDto getById(UUID svrId);

    List<VoteSubmissionRankingDto> getBySubmission(UUID submissionId);

    List<VoteSubmissionRankingDto> getByContest(UUID contestId);

    void deleteById(UUID svrId);

    int backfillFromVerifiedSubmissionsForElection(UUID electionId);


}
