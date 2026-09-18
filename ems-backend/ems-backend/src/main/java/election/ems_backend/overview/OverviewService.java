//package election.ems_backend.overview;
//
//
//import election.ems_backend.enums.DiscrepancyStatus;
//import election.ems_backend.enums.VoteStatus;
//import election.ems_backend.repository.*;
//import lombok.RequiredArgsConstructor;
//import org.springframework.stereotype.Service;


package election.ems_backend.overview;

import election.ems_backend.enums.DiscrepancyStatus;
import election.ems_backend.enums.VoteStatus;
import election.ems_backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class OverviewService {

    private final ElectionPartyRepository electionPartyRepository;
    private final ElectionCandidateRepository electionCandidateRepository;
    private final ContestRepository contestRepository;
    private final PollingCenterAllocationRepository pollingCenterAllocationRepository;
    private final PollingPlaceAllocationRepository pollingPlaceAllocationRepository;
    private final OrgSettingRepository orgSettingRepository;

    private final NecResultStagingRepository necResultStagingRepository;
    private final NECResultRepository necResultRepository;

    private final VoteSubmissionRepository voteSubmissionRepository;
    private final DiscrepancyRepository discrepancyRepository;
    private final AnomalyEventRepository anomalyEventRepository;

    @Transactional(readOnly = true)
    public OverviewDto getOverview(UUID electionId, UUID orgId, boolean isNecOrSystem) {

        // -------------------------
        // Readiness
        // -------------------------
        long qualifiedParties = electionPartyRepository.countQualifiedByElectionId(electionId);
        long candidatesAssigned = electionCandidateRepository.countByElectionId(electionId);

        long activeContests = contestRepository.countActiveByElectionId(electionId);
        long contestsMissingOptions = contestRepository.countActiveContestsMissingOptions(electionId);

        long centerAllocations = pollingCenterAllocationRepository.countByElection_ElectionId(electionId);
        long placeAllocations  = pollingPlaceAllocationRepository.countByElection_ElectionId(electionId);

        // Submissions enabled (org-scoped)
        boolean submissionsEnabled = false;
        if (orgId != null) {
            // ✅ SAFE: repository returns Boolean (nullable) when org_setting row is missing.
            // Use whichever you actually kept (global vs election-scoped flag):
            // submissionsEnabled = Boolean.TRUE.equals(orgSettingRepository.isSubmissionsEnabledForElection(orgId, electionId));
            submissionsEnabled = Boolean.TRUE.equals(orgSettingRepository.isSubmissionsEnabled(orgId));
        }

        // NEC staging/publish (NEC/System sees full, tenants can see counts too if you allow)
        long stagingImported = necResultStagingRepository.countByElectionId(electionId);
        long stagingUnvalidated = necResultStagingRepository.countUnvalidatedByElectionId(electionId);
        long officialPublished = necResultRepository.countPublishedByElectionId(electionId);

        var readiness = new OverviewDto.ReadinessDto(
                qualifiedParties,
                candidatesAssigned,
                activeContests,
                contestsMissingOptions,
                centerAllocations,
                placeAllocations,
                submissionsEnabled,
                stagingImported,
                stagingUnvalidated,
                officialPublished
        );

        // -------------------------
        // Org operational queues (org-scoped)
        // -------------------------
        Map<String, Long> byStatus = new LinkedHashMap<>();
        long missingTallySheets = 0;

        if (orgId != null) {
            // one DB call grouped
            for (var row : voteSubmissionRepository.countByStatusGrouped(electionId, orgId)) {
                byStatus.put(row.getStatus(), row.getCt());
            }

            // ensure keys exist even if empty
            for (VoteStatus s : VoteStatus.values()) {
                byStatus.putIfAbsent(s.name(), 0L);
            }

            // Missing tally sheet: only count statuses that require evidence
            missingTallySheets = voteSubmissionRepository.countMissingTallySheets(
                    electionId,
                    orgId,
                    List.of(VoteStatus.PENDING.name(), VoteStatus.FLAGGED.name())
            );
        }

        var orgQueues = new OverviewDto.OrgQueuesDto(byStatus, missingTallySheets);

        // -------------------------
        // Integrity summary (election-scoped)
        // -------------------------
        long openDiscrepancies = discrepancyRepository.countByElection_ElectionIdAndStatus(
                electionId, DiscrepancyStatus.OPEN
        );
        long anomaliesTotal = anomalyEventRepository.countByElection_ElectionId(electionId);

        var integrity = new OverviewDto.IntegrityDto(openDiscrepancies, anomaliesTotal);

        // -------------------------
        // Activity/freshness (org-scoped)
        // -------------------------
        LocalDateTime lastSubmissionTime = null;
        long submittedLast24h = 0;
        long verifiedLast24h = 0;
        long centersWithSubs = 0;
        long placesWithSubs = 0;

        if (orgId != null) {
            lastSubmissionTime = voteSubmissionRepository.findLastSubmissionTime(electionId, orgId);
            LocalDateTime since24h = LocalDateTime.now().minusHours(24);

            submittedLast24h = voteSubmissionRepository.countSubmittedSince(electionId, orgId, since24h);
            verifiedLast24h = voteSubmissionRepository.countVerifiedSince(electionId, orgId, since24h);
            centersWithSubs = voteSubmissionRepository.countDistinctCentersWithSubmissions(electionId, orgId);
            placesWithSubs = voteSubmissionRepository.countDistinctPlacesWithSubmissions(electionId, orgId);
        }

        var activity = new OverviewDto.ActivityDto(
                lastSubmissionTime,
                submittedLast24h,
                verifiedLast24h,
                centersWithSubs,
                placesWithSubs
        );

        return new OverviewDto(readiness, orgQueues, integrity, activity);
    }
}

//import org.springframework.transaction.annotation.Transactional;
//
//import java.time.LocalDateTime;
//import java.util.*;
//
//@Service
//@RequiredArgsConstructor
//public class OverviewService {
//
//    private final ElectionPartyRepository electionPartyRepository;
//    private final ElectionCandidateRepository electionCandidateRepository;
//    private final ContestRepository contestRepository;
//    private final PollingCenterAllocationRepository pollingCenterAllocationRepository;
//    private final PollingPlaceAllocationRepository pollingPlaceAllocationRepository;
//    private final OrgSettingRepository orgSettingRepository;
//
//    private final NecResultStagingRepository necResultStagingRepository;
//    private final NECResultRepository necResultRepository;
//
//    private final VoteSubmissionRepository voteSubmissionRepository;
//    private final DiscrepancyRepository discrepancyRepository;
//    private final AnomalyEventRepository anomalyEventRepository;
//
//    @Transactional(readOnly = true)
//    public OverviewDto getOverview(UUID electionId, UUID orgId, boolean isNecOrSystem) {
//
//        // -------------------------
//        // Readiness
//        // -------------------------
//        long qualifiedParties = electionPartyRepository.countQualifiedByElectionId(electionId);
//        long candidatesAssigned = electionCandidateRepository.countByElectionId(electionId);
//
//        long activeContests = contestRepository.countActiveByElectionId(electionId);
//        long contestsMissingOptions = contestRepository.countActiveContestsMissingOptions(electionId);
//
//        long centerAllocations = pollingCenterAllocationRepository.countByElection_ElectionId(electionId);
//        long placeAllocations  = pollingPlaceAllocationRepository.countByElection_ElectionId(electionId);
//
//        // Submissions enabled (org-scoped)
//        boolean submissionsEnabled = false;
//        if (orgId != null) {
//            // Use whichever you actually kept (global vs election-scoped flag)
//            // submissionsEnabled = orgSettingRepository.isSubmissionsEnabledForElection(orgId, electionId);
//            submissionsEnabled = orgSettingRepository.isSubmissionsEnabled(orgId);
//        }
//
//        // NEC staging/publish (NEC/System sees full, tenants can see counts too if you allow)
//        long stagingImported = necResultStagingRepository.countByElectionId(electionId);
//        long stagingUnvalidated = necResultStagingRepository.countUnvalidatedByElectionId(electionId);
//        long officialPublished = necResultRepository.countPublishedByElectionId(electionId);
//
//        var readiness = new OverviewDto.ReadinessDto(
//                qualifiedParties,
//                candidatesAssigned,
//                activeContests,
//                contestsMissingOptions,
//                centerAllocations,
//                placeAllocations,
//                submissionsEnabled,
//                stagingImported,
//                stagingUnvalidated,
//                officialPublished
//        );
//
//        // -------------------------
//        // Org operational queues (org-scoped)
//        // -------------------------
//        Map<String, Long> byStatus = new LinkedHashMap<>();
//        long missingTallySheets = 0;
//
//        if (orgId != null) {
//            // one DB call grouped
//            for (var row : voteSubmissionRepository.countByStatusGrouped(electionId, orgId)) {
//                byStatus.put(row.getStatus(), row.getCt());
//            }
//
//            // ensure keys exist even if empty
//            for (VoteStatus s : VoteStatus.values()) {
//                byStatus.putIfAbsent(s.name(), 0L);
//            }
//
//            // Missing tally sheet: only count statuses that require evidence
//            missingTallySheets = voteSubmissionRepository.countMissingTallySheets(
//                    electionId,
//                    orgId,
//                    List.of(VoteStatus.PENDING.name(), VoteStatus.FLAGGED.name())
//            );
//        }
//
//        var orgQueues = new OverviewDto.OrgQueuesDto(byStatus, missingTallySheets);
//
//        // -------------------------
//        // Integrity summary (election-scoped)
//        // -------------------------
//        long openDiscrepancies = discrepancyRepository.countByElection_ElectionIdAndStatus(electionId, DiscrepancyStatus.OPEN);
//        long anomaliesTotal = anomalyEventRepository.countByElection_ElectionId(electionId);
//
//        var integrity = new OverviewDto.IntegrityDto(openDiscrepancies, anomaliesTotal);
//
//        // -------------------------
//        // Activity/freshness (org-scoped)
//        // -------------------------
//        LocalDateTime lastSubmissionTime = null;
//        long submittedLast24h = 0;
//        long verifiedLast24h = 0;
//        long centersWithSubs = 0;
//        long placesWithSubs = 0;
//
//        if (orgId != null) {
//            lastSubmissionTime = voteSubmissionRepository.findLastSubmissionTime(electionId, orgId);
//            LocalDateTime since24h = LocalDateTime.now().minusHours(24);
//
//            submittedLast24h = voteSubmissionRepository.countSubmittedSince(electionId, orgId, since24h);
//            verifiedLast24h = voteSubmissionRepository.countVerifiedSince(electionId, orgId, since24h);
//            centersWithSubs = voteSubmissionRepository.countDistinctCentersWithSubmissions(electionId, orgId);
//            placesWithSubs = voteSubmissionRepository.countDistinctPlacesWithSubmissions(electionId, orgId);
//        }
//
//        var activity = new OverviewDto.ActivityDto(
//                lastSubmissionTime,
//                submittedLast24h,
//                verifiedLast24h,
//                centersWithSubs,
//                placesWithSubs
//        );
//
//        return new OverviewDto(readiness, orgQueues, integrity, activity);
//    }
//}
