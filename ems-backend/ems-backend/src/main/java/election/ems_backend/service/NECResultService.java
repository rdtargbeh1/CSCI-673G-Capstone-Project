package election.ems_backend.service;

import election.ems_backend.dto.*;
import election.ems_backend.entity.NECResult;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.entity.VoteSubmission;
import election.ems_backend.nec.NecResultPublishRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface NECResultService {

    NECResultDto get(UUID resultId);

    Page<NECResultDto> search(
            UUID electionId,
            UUID centerId,
            LocalDateTime uploadedAfter,
            LocalDateTime uploadedBefore,
            Pageable pageable
    );


    NECOverallTotalsDto totals(UUID electionId, UUID centerId);

    List<CandidateVoteTotalDto> totalsByCandidate(UUID electionId, UUID centerId);

    List<CandidateScopedTotalDto> byCountyPerCandidate(UUID electionId);

    List<CandidateScopedTotalDto> byDistrictPerCandidate(UUID electionId, UUID countyId);

    List<CandidateDailyTotalDto> dailyByCandidate(UUID electionId);

    boolean isPublishedForCenterContest(UUID electionId, UUID contestId, UUID centerId);

    void recomputeForCenterContest(UUID necOrgId,
                                   UUID electionId,
                                   UUID contestId,
                                   UUID centerId,
                                   UUID recomputedByUserId);

    void recomputeFromSubmission(UUID submissionId, UUID recomputedByUserId);


    boolean isElectionPublished(UUID electionId, UUID contestId);

    void recomputeForCenterContestWithNotes(UUID necOrgId,
                                            UUID electionId,
                                            UUID contestId,
                                            UUID centerId,
                                            UUID recomputedByUserId,
                                            String notes);


    void recomputeFromSubmissionWithNotes(UUID submissionId,
                                          UUID recomputedByUserId,
                                          String userNote);


    NECResult publishForCenterContest(UUID electionId,
                                      UUID contestId,
                                      UUID centerId,
                                      NecResultPublishRequest req);

    /**
     * Batch publish all NEC results for an election (wrapper over canonical publish).
     * Uses same ledger/signature/history/audit pipeline per result.
     */
    int publishElection(UUID electionId, NecResultPublishRequest req);

    /**
     * Canonical unpublish for a single center+contest scope.
     */
    NECResult unpublishForCenterContest(UUID electionId,
                                        UUID contestId,
                                        UUID centerId,
                                        UUID actorUserId,
                                        String reason);

    /**
     * Scheduled job unpublishes expired results via canonical unpublish pipeline.
     */
    int autoUnpublishExpired(LocalDateTime nowUtcOrLocal);

    int unpublishElection(UUID electionId, UUID actorUserId, String reason);


}