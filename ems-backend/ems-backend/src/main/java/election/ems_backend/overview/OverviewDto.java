package election.ems_backend.overview;

import java.time.LocalDateTime;
import java.util.Map;

public record OverviewDto(
        ReadinessDto readiness,
        OrgQueuesDto orgQueues,
        IntegrityDto integrity,
        ActivityDto activity
) {

    public record ReadinessDto(
            long qualifiedParties,
            long candidatesAssigned,
            long activeContests,
            long contestsMissingOptions,
            long centerAllocations,
            long placeAllocations,
            boolean submissionsEnabled,
            long stagingImported,
            long stagingUnvalidated,
            long officialPublished
    ) {}

    public record OrgQueuesDto(
            Map<String, Long> byStatus,
            long missingTallySheets
    ) {}

    public record IntegrityDto(
            long openDiscrepancies,
            long anomaliesTotal
    ) {}

    public record ActivityDto(
            LocalDateTime lastSubmissionTime,
            long submittedLast24h,
            long verifiedLast24h,
            long distinctCentersWithSubmissions,
            long distinctPlacesWithSubmissions
    ) {}
}
