package election.ems_backend.mapper;

import election.ems_backend.dto.DiscrepancyResponseDto;
import election.ems_backend.dto.DiscrepancySummaryDto;
import election.ems_backend.entity.Discrepancy;
import election.ems_backend.entity.District;
import election.ems_backend.entity.County;
import election.ems_backend.entity.PollingCenter;
import org.springframework.stereotype.Component;

@Component
public class DiscrepancyMapper {

    /**
     * Map Discrepancy entity to full response DTO
     */
    public DiscrepancyResponseDto toResponseDto(Discrepancy d) {
        if (d == null) {
            return null;
        }

        PollingCenter pc = d.getPollingCenter();
        District dist = pc != null ? pc.getDistrict() : null;
        County county = dist != null ? dist.getCounty() : null;

        return DiscrepancyResponseDto.builder()
                .discId(d.getDiscId())
                .submissionId(d.getVoteSubmission() != null ? d.getVoteSubmission().getSubmissionId() : null)
                .electionId(d.getElection().getElectionId())
                .placeId(d.getPollingPlace() != null ? d.getPollingPlace().getPlaceId() : null)
                .centerId(pc != null ? pc.getCenterId() : null)
                .orgId(d.getOrganization() != null ? d.getOrganization().getOrgId() : null)
                .contestId(d.getContestId())
                .discrepancyType(d.getDiscrepancyType())
                .reconciliationPhase(d.getReconciliationPhase())
                .resolutionAction(d.getResolutionAction())
                .severity(d.getSeverity())
                .fieldName(d.getFieldName())
                .expectedValue(d.getExpectedValue())
                .actualValue(d.getActualValue())
                .delta(d.getDelta())
                .description(d.getDescription())
                .details(d.getDetails())
                .status(d.getStatus())
                .resolutionNotes(d.getResolutionNotes())
                .resolvedById(d.getResolvedBy() != null ? d.getResolvedBy().getUserId() : null)
                .resolvedByName(d.getResolvedBy() != null ? getFullName(d.getResolvedBy()) : null)
                .resolvedAt(d.getResolvedAt())
                .createdById(d.getCreatedBy() != null ? d.getCreatedBy().getUserId() : null)
                .createdByName(d.getCreatedBy() != null ? getFullName(d.getCreatedBy()) : null)
                .createdAt(d.getCreatedAt())
                .updatedAt(d.getUpdatedAt())
                .build();
    }

    /**
     * Map Discrepancy entity to summary DTO (for list views)
     */
    public DiscrepancySummaryDto toSummaryDto(Discrepancy d) {
        if (d == null) {
            return null;
        }

        long daysSinceCreated = d.getCreatedAt() != null ?
                java.time.temporal.ChronoUnit.DAYS.between(d.getCreatedAt(), java.time.LocalDateTime.now()) : 0;

        return DiscrepancySummaryDto.builder()
                .discId(d.getDiscId())
                .submissionId(d.getVoteSubmission() != null ? d.getVoteSubmission().getSubmissionId() : null)
                .discrepancyType(d.getDiscrepancyType())
                .reconciliationPhase(d.getReconciliationPhase())
                .severity(d.getSeverity())
                .fieldName(d.getFieldName())
                .description(d.getDescription())
                .status(d.getStatus())
                .createdAt(d.getCreatedAt())
                .daysSinceCreated(daysSinceCreated)
                .build();
    }

    /**
     * Helper method to get full name from SystemUser
     */
    private String getFullName(election.ems_backend.entity.SystemUser user) {
        if (user == null) {
            return null;
        }
        return user.getFirstName() + " " + user.getLastName();
    }


}