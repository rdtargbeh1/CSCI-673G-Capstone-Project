package election.ems_backend.service.implement;

import election.ems_backend.dto.ReportRequest;
import election.ems_backend.dto.ReportSnapshotDto;

import election.ems_backend.entity.County;
import election.ems_backend.entity.District;
import election.ems_backend.entity.PollingCenter;
import election.ems_backend.entity.ReportFile;
import election.ems_backend.entity.ReportSnapshot;
import election.ems_backend.entity.UserElectionAssignment;

import election.ems_backend.enums.AssignmentScope;

import election.ems_backend.policy.OperationAccessPolicy;
import election.ems_backend.policy.OperationResourcePolicy;
import election.ems_backend.policy.OperationRolePolicy;

import election.ems_backend.repository.CountyRepository;
import election.ems_backend.repository.DistrictRepository;
import election.ems_backend.repository.ElectionRepository;
import election.ems_backend.repository.PollingCenterRepository;
import election.ems_backend.repository.ReportFileRepository;
import election.ems_backend.repository.ReportSnapshotRepository;

import election.ems_backend.service.ReportGeneratorService;
import election.ems_backend.service.ReportService;

import election.ems_backend.utility.SecurityUtils;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Example;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import org.springframework.http.HttpStatus;

import org.springframework.security.access.AccessDeniedException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;

import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

import java.util.stream.Collectors;

// ============================================================================
// REPORT SERVICE
// ============================================================================

@Service
@RequiredArgsConstructor
public class ReportServiceImplementation implements ReportService {

    private final ReportSnapshotRepository snapshotRepo;

    private final ReportFileRepository fileRepo;

    private final ReportGeneratorService generator;

    private final ElectionRepository electionRepo;

    private final CountyRepository countyRepo;

    private final DistrictRepository districtRepo;

    private final PollingCenterRepository centerRepo;

    private final OperationRolePolicy rolePolicy;

    private final OperationAccessPolicy accessPolicy;

    private final OperationResourcePolicy resourcePolicy;

    // ========================================================================
    // CREATE REPORT
    // ========================================================================

    @Override
    @Transactional
    public UUID createReport(
            ReportRequest req,
            String requestedBy
    ) {

        if (req == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Report request is required"
            );
        }

        if (req.getElectionId() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "electionId is required"
            );
        }

        UUID orgId =
                requireCurrentOrgId();

        // --------------------------------------------------------------------
        // ELECTION
        // --------------------------------------------------------------------

        electionRepo
                .findById(req.getElectionId())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Election not found"
                        )
                );

        // --------------------------------------------------------------------
        // NORMALIZE + VALIDATE GEOGRAPHY
        // --------------------------------------------------------------------

        ReportGeography geography =
                resolveGeography(req);

        // --------------------------------------------------------------------
        // AUTHORIZATION
        // --------------------------------------------------------------------

        boolean allowed =
                resourcePolicy.canGenerateReport(
                        req.getElectionId(),
                        geography.countyId(),
                        geography.districtId(),
                        geography.centerId(),
                        null
                );

        if (!allowed) {

            throw new AccessDeniedException(
                    "User is not authorized to generate a report for the requested election and geography"
            );
        }

        // --------------------------------------------------------------------
        // FORMAT
        // --------------------------------------------------------------------

        String format =
                normalizeFormat(
                        req.getFormat()
                );

        // --------------------------------------------------------------------
        // SNAPSHOT
        // --------------------------------------------------------------------

        ReportSnapshot snapshot =
                new ReportSnapshot();

        snapshot.setSnapshotId(
                UUID.randomUUID()
        );

        snapshot.setOrgId(
                orgId
        );

        snapshot.setElectionId(
                req.getElectionId()
        );

        /*
         * Store the complete normalized geography.
         *
         * Example:
         *
         * CENTER report:
         *
         * countyId   = parent county
         * districtId = parent district
         * centerId   = requested center
         *
         * This allows later authorization and database filtering to use the
         * actual hierarchy without reconstructing it.
         */
        snapshot.setCountyId(
                geography.countyId()
        );

        snapshot.setDistrictId(
                geography.districtId()
        );

        snapshot.setCenterId(
                geography.centerId()
        );

        // --------------------------------------------------------------------
        // RESULT FILTERS
        // --------------------------------------------------------------------

        snapshot.setCandidateId(
                req.getCandidateId()
        );

        snapshot.setPartyId(
                req.getPartyId()
        );

        snapshot.setFilters(
                null
        );

        // --------------------------------------------------------------------
        // REQUEST
        // --------------------------------------------------------------------

        snapshot.setRequestedFormat(
                format
        );

        snapshot.setRequestedBy(
                requestedBy == null
                        || requestedBy.isBlank()

                        ? "unknown"

                        : requestedBy.trim()
        );

        snapshot.setRequestedAt(
                OffsetDateTime.now()
        );

        snapshot.setStatus(
                "PENDING"
        );

        snapshot.setStatusMessage(
                null
        );

        snapshot.setRetryCount(
                0
        );

        ReportSnapshot saved =
                snapshotRepo.save(
                        snapshot
                );

        // --------------------------------------------------------------------
        // ASYNC GENERATION
        // --------------------------------------------------------------------

        generator.generate(
                saved.getSnapshotId()
        );

        return saved.getSnapshotId();
    }

    // ========================================================================
    // GET ONE SNAPSHOT
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public ReportSnapshotDto getSnapshot(
            UUID snapshotId
    ) {

        ReportSnapshot snapshot =
                loadAuthorizedSnapshot(
                        snapshotId
                );

        /*
         * Detail response includes the newest generated file ID.
         */
        return toDto(
                snapshot,
                true
        );
    }

    // ========================================================================
    // LIST SNAPSHOTS
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public Page<ReportSnapshotDto> listSnapshots(
            UUID electionId,
            Pageable pageable
    ) {

        UUID orgId =
                requireCurrentOrgId();

        if (pageable == null) {

            pageable =
                    PageRequest.of(
                            0,
                            20,
                            Sort.by(
                                    Sort.Direction.DESC,
                                    "requestedAt"
                            )
                    );
        }

        if (!rolePolicy.canViewScopedReports()) {

            throw new AccessDeniedException(
                    "User is not authorized to view reports"
            );
        }

        // ====================================================================
        // ADMINISTRATIVE USERS
        // ====================================================================
        //
        // Preserve the existing administrative model:
        //
        // no electionId
        //      -> all reports in the current organization
        //
        // electionId
        //      -> reports for the selected election
        //
        // ====================================================================

        if (rolePolicy.isAdministrativeRole()) {

            Page<ReportSnapshot> page =
                    electionId == null

                            ? snapshotRepo.findByOrgId(
                            orgId,
                            pageable
                    )

                            : snapshotRepo.findByOrgIdAndElectionId(
                            orgId,
                            electionId,
                            pageable
                    );

            return page.map(
                    snapshot ->
                            toDto(
                                    snapshot,
                                    false
                            )
            );
        }

        // ====================================================================
        // OPERATIONAL USERS
        // ====================================================================
        //
        // The Operations Portal itself does not require an election.
        //
        // Generated report DATA is election-scoped.
        //
        // ====================================================================

        if (!rolePolicy.isOperationalRole()) {

            throw new AccessDeniedException(
                    "User does not have access to operational reports"
            );
        }

        if (electionId == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Election ID is required when viewing operational reports"
            );
        }

        AssignmentScope scope =
                accessPolicy.currentScope(
                        electionId
                );

        if (scope == null) {

            throw new AccessDeniedException(
                    "User does not have an active assignment for this election"
            );
        }

        List<UserElectionAssignment> assignments =
                accessPolicy.currentAssignments(
                        electionId
                );

        // ====================================================================
        // MULTI_COUNTY / COUNTY
        // ====================================================================
        //
        // Because normalized DISTRICT and CENTER reports also store countyId,
        // this query returns:
        //
        // - county-level reports
        // - district reports inside those counties
        // - center reports inside those counties
        //
        // ====================================================================

        if (
                scope == AssignmentScope.MULTI_COUNTY
                        || scope == AssignmentScope.COUNTY
        ) {

            Set<UUID> countyIds =
                    assignments
                            .stream()
                            .map(
                                    UserElectionAssignment::getCounty
                            )
                            .filter(
                                    Objects::nonNull
                            )
                            .map(
                                    County::getCountyId
                            )
                            .filter(
                                    Objects::nonNull
                            )
                            .collect(
                                    Collectors.toSet()
                            );

            if (countyIds.isEmpty()) {

                return Page.empty(
                        pageable
                );
            }

            return snapshotRepo
                    .findByOrgIdAndElectionIdAndCountyIdIn(
                            orgId,
                            electionId,
                            countyIds,
                            pageable
                    )
                    .map(
                            snapshot ->
                                    toDto(
                                            snapshot,
                                            false
                                    )
                    );
        }

        // ====================================================================
        // DISTRICT
        // ====================================================================

        if (scope == AssignmentScope.DISTRICT) {

            Set<UUID> districtIds =
                    assignments
                            .stream()
                            .map(
                                    UserElectionAssignment::getDistrict
                            )
                            .filter(
                                    Objects::nonNull
                            )
                            .map(
                                    District::getDistrictId
                            )
                            .filter(
                                    Objects::nonNull
                            )
                            .collect(
                                    Collectors.toSet()
                            );

            if (districtIds.isEmpty()) {

                return Page.empty(
                        pageable
                );
            }

            return snapshotRepo
                    .findByOrgIdAndElectionIdAndDistrictIdIn(
                            orgId,
                            electionId,
                            districtIds,
                            pageable
                    )
                    .map(
                            snapshot ->
                                    toDto(
                                            snapshot,
                                            false
                                    )
                    );
        }

        // ====================================================================
        // CENTER
        // ====================================================================

        if (scope == AssignmentScope.CENTER) {

            Set<UUID> centerIds =
                    assignments
                            .stream()
                            .map(
                                    UserElectionAssignment::getCenter
                            )
                            .filter(
                                    Objects::nonNull
                            )
                            .map(
                                    PollingCenter::getCenterId
                            )
                            .filter(
                                    Objects::nonNull
                            )
                            .collect(
                                    Collectors.toSet()
                            );

            if (centerIds.isEmpty()) {

                return Page.empty(
                        pageable
                );
            }

            return snapshotRepo
                    .findByOrgIdAndElectionIdAndCenterIdIn(
                            orgId,
                            electionId,
                            centerIds,
                            pageable
                    )
                    .map(
                            snapshot ->
                                    toDto(
                                            snapshot,
                                            false
                                    )
                    );
        }

        // ====================================================================
        // PLACE
        // ====================================================================
        //
        // ReportSnapshot currently has no placeId.
        //
        // A center report represents the whole center, not one polling place.
        //
        // Therefore a PLACE assignment cannot safely consume generated
        // ReportSnapshot data.
        //
        // ====================================================================

        if (scope == AssignmentScope.PLACE) {

            return Page.empty(
                    pageable
            );
        }

        // ====================================================================
        // ORGANIZATION
        // ====================================================================
        //
        // Regular operational ORGANIZATION scope is intentionally not treated
        // as generated-report authority.
        //
        // Administrative organization-wide users were already handled above.
        //
        // ====================================================================

        return Page.empty(
                pageable
        );
    }

    // ========================================================================
    // DOWNLOAD
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public byte[] downloadReport(
            UUID snapshotId
    ) throws Exception {

        /*
         * Authorization happens before the generated artifact is loaded.
         */
        ReportSnapshot snapshot =
                loadAuthorizedSnapshot(
                        snapshotId
                );

        ReportFile probe =
                new ReportFile();

        probe.setSnapshotId(
                snapshot.getSnapshotId()
        );

        ReportFile file =
                fileRepo
                        .findAll(
                                Example.of(
                                        probe
                                ),
                                PageRequest.of(
                                        0,
                                        1,
                                        Sort.by(
                                                Sort.Direction.DESC,
                                                "generatedAt"
                                        )
                                )
                        )
                        .stream()
                        .findFirst()
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Generated report file not found"
                                )
                        );

        if (file.getFileBlob() != null) {

            return file.getFileBlob();
        }

        /*
         * External storage artifacts are handled by ReportController because
         * the controller may return a redirect/presigned URL.
         */
        throw new UnsupportedOperationException(
                "Use the controller download endpoint for externally stored reports"
        );
    }

    // ========================================================================
    // LOAD + AUTHORIZE ONE SNAPSHOT
    // ========================================================================

    private ReportSnapshot loadAuthorizedSnapshot(
            UUID snapshotId
    ) {

        if (snapshotId == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "snapshotId is required"
            );
        }

        UUID currentOrgId =
                requireCurrentOrgId();

        ReportSnapshot snapshot =
                snapshotRepo
                        .findById(
                                snapshotId
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Report snapshot not found"
                                )
                        );

        // ====================================================================
        // ORGANIZATION BOUNDARY FIRST
        // ====================================================================

        if (
                snapshot.getOrgId() == null
                        || !snapshot
                        .getOrgId()
                        .equals(
                                currentOrgId
                        )
        ) {

            throw new AccessDeniedException(
                    "User does not have access to this report"
            );
        }

        // ====================================================================
        // ADMINISTRATIVE
        // ====================================================================

        if (rolePolicy.isAdministrativeRole()) {

            return snapshot;
        }

        // ====================================================================
        // OPERATIONAL
        // ====================================================================

        if (!rolePolicy.isOperationalRole()) {

            throw new AccessDeniedException(
                    "User does not have access to this report"
            );
        }

        if (snapshot.getElectionId() == null) {

            throw new AccessDeniedException(
                    "Report does not have a valid election context"
            );
        }

        AssignmentScope scope =
                accessPolicy.currentScope(
                        snapshot.getElectionId()
                );

        if (scope == null) {

            throw new AccessDeniedException(
                    "User does not have an active assignment for this report's election"
            );
        }

        // --------------------------------------------------------------------
        // PLACE
        // --------------------------------------------------------------------
        //
        // Do not rely on parent CENTER visibility here.
        //
        // PLACE can reference its parent center for navigation, but that does
        // not authorize access to a center-wide generated report.
        //
        // --------------------------------------------------------------------

        if (scope == AssignmentScope.PLACE) {

            throw new AccessDeniedException(
                    "Polling-place assignments do not have access to generated aggregate reports"
            );
        }

        // --------------------------------------------------------------------
        // ORGANIZATION
        // --------------------------------------------------------------------

        if (scope == AssignmentScope.ORGANIZATION) {

            throw new AccessDeniedException(
                    "Operational organization scope does not grant generated-report access"
            );
        }

        // --------------------------------------------------------------------
        // RESOURCE SCOPE
        // --------------------------------------------------------------------

        boolean allowed =
                resourcePolicy.canViewReportSnapshot(
                        snapshot.getElectionId(),
                        snapshot.getCountyId(),
                        snapshot.getDistrictId(),
                        snapshot.getCenterId(),
                        null
                );

        if (!allowed) {

            throw new AccessDeniedException(
                    "Report is outside the user's election assignment scope"
            );
        }

        return snapshot;
    }

    // ========================================================================
    // NORMALIZE GEOGRAPHY
    // ========================================================================

    private ReportGeography resolveGeography(
            ReportRequest req
    ) {

        UUID requestedCountyId =
                req.getCountyId();

        UUID requestedDistrictId =
                req.getDistrictId();

        UUID requestedCenterId =
                req.getCenterId();

        // ====================================================================
        // CENTER
        // ====================================================================

        if (requestedCenterId != null) {

            PollingCenter center =
                    centerRepo
                            .findById(
                                    requestedCenterId
                            )
                            .orElseThrow(() ->
                                    new ResponseStatusException(
                                            HttpStatus.NOT_FOUND,
                                            "Polling center not found"
                                    )
                            );

            District district =
                    center.getDistrict();

            if (
                    district == null
                            || district.getDistrictId() == null
            ) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Polling center does not have a valid district"
                );
            }

            County county =
                    district.getCounty();

            if (
                    county == null
                            || county.getCountyId() == null
            ) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Polling center does not have a valid county"
                );
            }

            if (
                    requestedDistrictId != null
                            && !requestedDistrictId.equals(
                            district.getDistrictId()
                    )
            ) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Polling center does not belong to the requested district"
                );
            }

            if (
                    requestedCountyId != null
                            && !requestedCountyId.equals(
                            county.getCountyId()
                    )
            ) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Polling center does not belong to the requested county"
                );
            }

            return new ReportGeography(
                    county.getCountyId(),
                    district.getDistrictId(),
                    center.getCenterId()
            );
        }

        // ====================================================================
        // DISTRICT
        // ====================================================================

        if (requestedDistrictId != null) {

            District district =
                    districtRepo
                            .findById(
                                    requestedDistrictId
                            )
                            .orElseThrow(() ->
                                    new ResponseStatusException(
                                            HttpStatus.NOT_FOUND,
                                            "District not found"
                                    )
                            );

            County county =
                    district.getCounty();

            if (
                    county == null
                            || county.getCountyId() == null
            ) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "District does not have a valid county"
                );
            }

            if (
                    requestedCountyId != null
                            && !requestedCountyId.equals(
                            county.getCountyId()
                    )
            ) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "District does not belong to the requested county"
                );
            }

            return new ReportGeography(
                    county.getCountyId(),
                    district.getDistrictId(),
                    null
            );
        }

        // ====================================================================
        // COUNTY
        // ====================================================================

        if (requestedCountyId != null) {

            County county =
                    countyRepo
                            .findById(
                                    requestedCountyId
                            )
                            .orElseThrow(() ->
                                    new ResponseStatusException(
                                            HttpStatus.NOT_FOUND,
                                            "County not found"
                                    )
                            );

            return new ReportGeography(
                    county.getCountyId(),
                    null,
                    null
            );
        }

        // ====================================================================
        // ELECTION-WIDE
        // ====================================================================

        return new ReportGeography(
                null,
                null,
                null
        );
    }

    // ========================================================================
    // DTO
    // ========================================================================

    private ReportSnapshotDto toDto(
            ReportSnapshot snapshot,
            boolean includeFile
    ) {

        ReportSnapshotDto dto =
                new ReportSnapshotDto();

        // --------------------------------------------------------------------
        // IDENTITY
        // --------------------------------------------------------------------

        dto.setSnapshotId(
                snapshot.getSnapshotId()
        );

        dto.setOrgId(
                snapshot.getOrgId()
        );

        dto.setElectionId(
                snapshot.getElectionId()
        );

        // --------------------------------------------------------------------
        // GEOGRAPHIC SCOPE
        // --------------------------------------------------------------------

        dto.setCountyId(
                snapshot.getCountyId()
        );

        dto.setDistrictId(
                snapshot.getDistrictId()
        );

        dto.setCenterId(
                snapshot.getCenterId()
        );

        // --------------------------------------------------------------------
        // RESULT FILTERS
        // --------------------------------------------------------------------

        dto.setCandidateId(
                snapshot.getCandidateId()
        );

        dto.setPartyId(
                snapshot.getPartyId()
        );

        // --------------------------------------------------------------------
        // REQUEST
        // --------------------------------------------------------------------

        dto.setRequestedFormat(
                snapshot.getRequestedFormat()
        );

        dto.setRequestedAt(
                snapshot.getRequestedAt()
        );

        dto.setRequestedBy(
                snapshot.getRequestedBy()
        );

        // --------------------------------------------------------------------
        // STATUS
        // --------------------------------------------------------------------

        dto.setStatus(
                snapshot.getStatus()
        );

        dto.setStatusMessage(
                snapshot.getStatusMessage()
        );

        dto.setExpiresAt(
                snapshot.getExpiresAt()
        );

        dto.setRetryCount(
                snapshot.getRetryCount()
        );

        // --------------------------------------------------------------------
        // GENERATED FILE
        // --------------------------------------------------------------------
        //
        // Only detail responses load file metadata.
        //
        // List responses deliberately avoid this lookup to prevent one extra
        // ReportFile query for every report row.
        //
        // --------------------------------------------------------------------

        if (includeFile) {

            ReportFile probe =
                    new ReportFile();

            probe.setSnapshotId(
                    snapshot.getSnapshotId()
            );

            fileRepo
                    .findAll(
                            Example.of(
                                    probe
                            ),
                            PageRequest.of(
                                    0,
                                    1,
                                    Sort.by(
                                            Sort.Direction.DESC,
                                            "generatedAt"
                                    )
                            )
                    )
                    .stream()
                    .findFirst()
                    .ifPresent(
                            file ->
                                    dto.setFileId(
                                            file.getFileId()
                                    )
                    );
        }

        return dto;
    }

    // ========================================================================
    // FORMAT
    // ========================================================================

    private String normalizeFormat(
            String value
    ) {

        String format =
                value == null
                        || value.isBlank()

                        ? "CSV"

                        : value
                        .trim()
                        .toUpperCase(
                                Locale.ROOT
                        );

        return switch (format) {

            case "CSV",
                 "XLSX",
                 "PDF" -> format;

            default ->
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "Unsupported report format: " + format
                    );
        };
    }

    // ========================================================================
    // ORGANIZATION
    // ========================================================================

    private UUID requireCurrentOrgId() {

        UUID orgId =
                SecurityUtils.getOrgIdFromContext();

        if (orgId == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Caller must be in an organization context"
            );
        }

        return orgId;
    }

    // ========================================================================
    // INTERNAL GEOGRAPHY
    // ========================================================================

    private record ReportGeography(
            UUID countyId,
            UUID districtId,
            UUID centerId
    ) {
    }
}