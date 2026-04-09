package election.ems_backend.service;

import election.ems_backend.dto.VoteSubmissionContestBulkRequest;
import election.ems_backend.dto.VoteSubmissionContestCreateRequest;
import election.ems_backend.dto.VoteSubmissionContestDto;
import election.ems_backend.dto.VoteSubmissionContestUpdateRequest;

import java.util.List;
import java.util.UUID;

/**
        * Service to normalize submissions into submission_contest_vote rows.
 */
public interface VoteSubmissionContestService {
    /**
     * Normalize a single submission into submission_contest_vote rows.
     * This is idempotent: it deletes any existing normalized rows for the submission before inserting.
     *
     * @param submissionId the submission to normalize
     * @return number of normalized rows created
     */
    int normalizeSubmission(UUID submissionId);

    /**
     * Normalize all VERIFIED submissions for an election (useful for backfill).
     * Returns total rows normalized (sum over submissions).
     */
    int normalizeVerifiedSubmissionsForElection(UUID electionId);

    ///
    VoteSubmissionContestDto createOrUpdate(VoteSubmissionContestCreateRequest req);

    VoteSubmissionContestDto update(UUID scvId, VoteSubmissionContestUpdateRequest req);

    VoteSubmissionContestDto get(UUID scvId);

    List<VoteSubmissionContestDto> listBySubmission(UUID submissionId);

    List<VoteSubmissionContestDto> listBySubmissionAndContest(UUID submissionId, UUID contestId);

    void delete(UUID scvId);

    /**
     * Replace all votes for this submission+contest (atomic user experience).
     * Common pattern: user submits contest selections once.
     */
    List<VoteSubmissionContestDto> replaceContestVotes(VoteSubmissionContestBulkRequest req);

}