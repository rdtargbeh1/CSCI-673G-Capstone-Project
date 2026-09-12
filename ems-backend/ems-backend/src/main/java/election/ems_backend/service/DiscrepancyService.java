package election.ems_backend.service;

import election.ems_backend.dto.*;
import election.ems_backend.entity.Discrepancy;
import election.ems_backend.entity.VoteSubmission;
import election.ems_backend.enums.DiscrepancySeverity;
import election.ems_backend.enums.DiscrepancyStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface DiscrepancyService {


    Discrepancy createOpeningPhaseDiscrepancy(
            VoteSubmission submission,
            Integer ballotsIssued,
            DiscrepancySeverity severity);

    Discrepancy createBallotReconciliationDiscrepancy(
            VoteSubmission submission,
            Integer ballotsIssued,
            DiscrepancySeverity severity);

    Discrepancy createVoteTallyDiscrepancy(
            VoteSubmission submission,
            DiscrepancySeverity severity);


    Discrepancy createBallotsInBoxDiscrepancy(
            VoteSubmission submission,
            DiscrepancySeverity severity);


    Discrepancy createOcrMismatchDiscrepancy(
            VoteSubmission submission,
            String fieldName,
            String expectedValue,
            String actualValue,
            Map<String, Object> details,
            DiscrepancySeverity severity);

    void revalidateSubmissionDiscrepancies(VoteSubmission submission, PollingPlaceAllocationDto alloc);

//    void revalidateSubmissionDiscrepancies(VoteSubmission submission, Integer ballotsIssued);

    Discrepancy resolveDiscrepancy(
            UUID discrepancyId,
            UUID supervisorId,
            DiscrepancyResolutionDto request);


    Page<DiscrepancyResponseDto> search(DiscrepancyFilterDto filter, Pageable pageable);

    DiscrepancyResponseDto getById(UUID id);

    List<DiscrepancySummaryDto> getBySubmission(UUID submissionI);

    List<DiscrepancySummaryDto> getOpenByElection(UUID electionId);

    long countOpenByElection(UUID electionId);


}
