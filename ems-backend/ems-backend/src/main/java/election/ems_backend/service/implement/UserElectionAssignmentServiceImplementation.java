package election.ems_backend.service.implement;

import election.ems_backend.dto.UserElectionAssignmentDto;
import election.ems_backend.dto.UserElectionAssignmentRequest;
import election.ems_backend.entity.*;
import election.ems_backend.enums.AssignmentScope;
import election.ems_backend.repository.*;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
@Transactional
public class UserElectionAssignmentServiceImplementation {

    private final UserElectionAssignmentRepository assignmentRepository;

    private final SystemUserRepository systemUserRepository;

    private final OrganizationRepository organizationRepository;

    private final ElectionRepository electionRepository;

    private final CountyRepository countyRepository;

    private final DistrictRepository districtRepository;

    private final PollingCenterRepository pollingCenterRepository;

    private final PollingPlaceRepository pollingPlaceRepository;


    // ========================================================================
    // CREATE / REPLACE ASSIGNMENT
    // ========================================================================

    public List<UserElectionAssignmentDto> assign(
            UserElectionAssignmentRequest request
    ) {

        validateBaseRequest(request);


        SystemUser user =
                systemUserRepository
                        .findById(request.getUserId())
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "User not found"
                                )
                        );


        Organization organization =
                organizationRepository
                        .findById(request.getOrgId())
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Organization not found"
                                )
                        );


        Election election =
                electionRepository
                        .findById(request.getElectionId())
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Election not found"
                                )
                        );


        /*
         * Resolve and validate the complete new assignment set BEFORE
         * changing the user's current assignment.
         *
         * Nothing has been written to the database at this point.
         */
        List<UserElectionAssignment> newAssignments =
                switch (request.getScopeType()) {

                    case ORGANIZATION ->
                            buildOrganizationAssignment(
                                    user,
                                    organization,
                                    election
                            );

                    case MULTI_COUNTY ->
                            buildMultiCountyAssignments(
                                    request,
                                    user,
                                    organization,
                                    election
                            );

                    case COUNTY ->
                            buildCountyAssignment(
                                    request,
                                    user,
                                    organization,
                                    election
                            );

                    case DISTRICT ->
                            buildDistrictAssignment(
                                    request,
                                    user,
                                    organization,
                                    election
                            );

                    case CENTER ->
                            buildCenterAssignments(
                                    request,
                                    user,
                                    organization,
                                    election
                            );

                    case PLACE ->
                            buildPlaceAssignment(
                                    request,
                                    user,
                                    organization,
                                    election
                            );
                };


        /*
         * The complete new assignment is valid.
         *
         * We can now replace the existing active assignment set.
         */
        deactivateExistingAssignments(
                user.getUserId(),
                organization.getOrgId(),
                election.getElectionId()
        );


        /*
         * Important:
         *
         * Force Hibernate to UPDATE the old active rows before INSERTING
         * the replacement active rows.
         *
         * This prevents conflicts with the partial unique indexes that
         * apply only where is_active = TRUE.
         */
        assignmentRepository.flush();


        List<UserElectionAssignment> saved =
                assignmentRepository.saveAll(
                        newAssignments
                );


        assignmentRepository.flush();


        return saved
                .stream()
                .map(this::toDto)
                .toList();
    }


    // ========================================================================
    // ORGANIZATION
    // ========================================================================

    private List<UserElectionAssignment> buildOrganizationAssignment(
            SystemUser user,
            Organization organization,
            Election election
    ) {

        UserElectionAssignment assignment =
                baseAssignment(
                        user,
                        organization,
                        election,
                        AssignmentScope.ORGANIZATION
                );


        return List.of(
                assignment
        );
    }


    // ========================================================================
    // MULTI COUNTY
    // ========================================================================

    private List<UserElectionAssignment> buildMultiCountyAssignments(
            UserElectionAssignmentRequest request,
            SystemUser user,
            Organization organization,
            Election election
    ) {

        List<UUID> countyIds =
                normalizeIds(
                        request.getCountyIds()
                );


        if (countyIds.size() < 2) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "MULTI_COUNTY requires at least two counties"
            );
        }


        List<UserElectionAssignment> assignments =
                new ArrayList<>();


        for (UUID countyId : countyIds) {

            County county =
                    countyRepository
                            .findById(countyId)
                            .orElseThrow(() ->
                                    new ResponseStatusException(
                                            HttpStatus.NOT_FOUND,
                                            "County not found: " + countyId
                                    )
                            );


            UserElectionAssignment assignment =
                    baseAssignment(
                            user,
                            organization,
                            election,
                            AssignmentScope.MULTI_COUNTY
                    );


            assignment.setCounty(
                    county
            );


            assignments.add(
                    assignment
            );
        }


        return assignments;
    }


    // ========================================================================
    // COUNTY
    // ========================================================================

    private List<UserElectionAssignment> buildCountyAssignment(
            UserElectionAssignmentRequest request,
            SystemUser user,
            Organization organization,
            Election election
    ) {

        UUID countyId =
                requireId(
                        request.getCountyId(),
                        "countyId is required for COUNTY assignment"
                );


        County county =
                countyRepository
                        .findById(countyId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "County not found"
                                )
                        );


        UserElectionAssignment assignment =
                baseAssignment(
                        user,
                        organization,
                        election,
                        AssignmentScope.COUNTY
                );


        assignment.setCounty(
                county
        );


        return List.of(
                assignment
        );
    }


    // ========================================================================
    // DISTRICT
    // ========================================================================

    private List<UserElectionAssignment> buildDistrictAssignment(
            UserElectionAssignmentRequest request,
            SystemUser user,
            Organization organization,
            Election election
    ) {

        UUID districtId =
                requireId(
                        request.getDistrictId(),
                        "districtId is required for DISTRICT assignment"
                );


        District district =
                districtRepository
                        .findById(districtId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "District not found"
                                )
                        );


        /*
         * County is authoritative from the District entity.
         */
        County county =
                district.getCounty();


        if (county == null) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "District is not associated with a county"
            );
        }


        UserElectionAssignment assignment =
                baseAssignment(
                        user,
                        organization,
                        election,
                        AssignmentScope.DISTRICT
                );


        assignment.setCounty(
                county
        );

        assignment.setDistrict(
                district
        );


        return List.of(
                assignment
        );
    }


    // ========================================================================
    // CENTER
    // ========================================================================

    private List<UserElectionAssignment> buildCenterAssignments(
            UserElectionAssignmentRequest request,
            SystemUser user,
            Organization organization,
            Election election
    ) {

        List<UUID> centerIds =
                normalizeIds(
                        request.getCenterIds()
                );


        /*
         * CENTER supports both:
         *
         * centerId  -> one center
         * centerIds -> multiple centers
         */
        if (
                centerIds.isEmpty()
                        &&
                        request.getCenterId() != null
        ) {

            centerIds =
                    List.of(
                            request.getCenterId()
                    );
        }


        if (centerIds.isEmpty()) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "At least one center is required for CENTER assignment"
            );
        }


        List<UserElectionAssignment> assignments =
                new ArrayList<>();


        for (UUID centerId : centerIds) {

            PollingCenter center =
                    pollingCenterRepository
                            .findById(centerId)
                            .orElseThrow(() ->
                                    new ResponseStatusException(
                                            HttpStatus.NOT_FOUND,
                                            "Polling center not found: " + centerId
                                    )
                            );


            District district =
                    center.getDistrict();


            if (district == null) {

                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Polling center is not associated with a district: "
                                + centerId
                );
            }


            County county =
                    district.getCounty();


            if (county == null) {

                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Polling center district is not associated with a county: "
                                + centerId
                );
            }


            /*
             * Each center row carries its actual parent geography.
             *
             * A supervisor can therefore be assigned centers across
             * different districts or counties.
             */
            UserElectionAssignment assignment =
                    baseAssignment(
                            user,
                            organization,
                            election,
                            AssignmentScope.CENTER
                    );


            assignment.setCounty(
                    county
            );

            assignment.setDistrict(
                    district
            );

            assignment.setCenter(
                    center
            );


            assignments.add(
                    assignment
            );
        }


        return assignments;
    }


    // ========================================================================
    // PLACE
    // ========================================================================

    private List<UserElectionAssignment> buildPlaceAssignment(
            UserElectionAssignmentRequest request,
            SystemUser user,
            Organization organization,
            Election election
    ) {

        UUID placeId =
                requireId(
                        request.getPlaceId(),
                        "placeId is required for PLACE assignment"
                );


        PollingPlace place =
                pollingPlaceRepository
                        .findById(placeId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Polling place not found"
                                )
                        );


        PollingCenter center =
                place.getPollingCenter();


        if (center == null) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Polling place is not associated with a polling center"
            );
        }


        District district =
                center.getDistrict();


        if (district == null) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Polling place center is not associated with a district"
            );
        }


        County county =
                district.getCounty();


        if (county == null) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Polling place district is not associated with a county"
            );
        }


        UserElectionAssignment assignment =
                baseAssignment(
                        user,
                        organization,
                        election,
                        AssignmentScope.PLACE
                );


        assignment.setCounty(
                county
        );

        assignment.setDistrict(
                district
        );

        assignment.setCenter(
                center
        );

        assignment.setPlace(
                place
        );


        return List.of(
                assignment
        );
    }


    // ========================================================================
// GET ACTIVE ASSIGNMENTS - ONE USER
// ========================================================================

    @Transactional(readOnly = true)
    public List<UserElectionAssignmentDto> findActiveAssignments(
            UUID userId,
            UUID orgId,
            UUID electionId
    ) {

        return assignmentRepository
                .findByUser_UserIdAndOrganization_OrgIdAndElection_ElectionIdAndIsActiveTrue(
                        userId,
                        orgId,
                        electionId
                )
                .stream()
                .map(this::toDto)
                .toList();
    }


// ========================================================================
// LIST ACTIVE ASSIGNMENTS - ORGANIZATION + ELECTION
// ========================================================================

    @Transactional(readOnly = true)
    public List<UserElectionAssignmentDto> findActiveAssignments(
            UUID orgId,
            UUID electionId
    ) {

        if (orgId == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "orgId is required"
            );
        }


        if (electionId == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "electionId is required"
            );
        }


        return assignmentRepository
                .findByOrganization_OrgIdAndElection_ElectionIdAndIsActiveTrueOrderByDateCreatedDesc(
                        orgId,
                        electionId
                )
                .stream()
                .map(this::toDto)
                .toList();
    }

    // ========================================================================
    // DEACTIVATE ASSIGNMENT SET
    // ========================================================================

    public void deactivateAssignments(
            UUID userId,
            UUID orgId,
            UUID electionId
    ) {

        deactivateExistingAssignments(
                userId,
                orgId,
                electionId
        );


        assignmentRepository.flush();
    }


    private void deactivateExistingAssignments(
            UUID userId,
            UUID orgId,
            UUID electionId
    ) {

        List<UserElectionAssignment> existing =
                assignmentRepository
                        .findByUser_UserIdAndOrganization_OrgIdAndElection_ElectionIdAndIsActiveTrue(
                                userId,
                                orgId,
                                electionId
                        );


        if (existing.isEmpty()) {
            return;
        }


        for (UserElectionAssignment assignment : existing) {

            assignment.setActive(
                    false
            );
        }


        assignmentRepository.saveAll(
                existing
        );
    }


    // ========================================================================
    // BASE ENTITY
    // ========================================================================

    private UserElectionAssignment baseAssignment(
            SystemUser user,
            Organization organization,
            Election election,
            AssignmentScope scopeType
    ) {

        return UserElectionAssignment
                .builder()
                .user(user)
                .organization(organization)
                .election(election)
                .scopeType(scopeType)
                .isActive(true)
                .build();
    }


    // ========================================================================
    // VALIDATION
    // ========================================================================

    private void validateBaseRequest(
            UserElectionAssignmentRequest request
    ) {

        if (request == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Request body is required"
            );
        }


        if (request.getUserId() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "userId is required"
            );
        }


        if (request.getOrgId() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "orgId is required"
            );
        }


        if (request.getElectionId() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "electionId is required"
            );
        }


        if (request.getScopeType() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "scopeType is required"
            );
        }
    }


    // ========================================================================
    // REQUIRE ID
    // ========================================================================

    private UUID requireId(
            UUID value,
            String message
    ) {

        if (value == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    message
            );
        }


        return value;
    }


    // ========================================================================
    // NORMALIZE IDS
    // ========================================================================

    private List<UUID> normalizeIds(
            List<UUID> values
    ) {

        if (
                values == null
                        ||
                        values.isEmpty()
        ) {

            return List.of();
        }


        return values
                .stream()
                .filter(Objects::nonNull)
                .distinct()
                .collect(
                        Collectors.toList()
                );
    }


    // ========================================================================
    // DTO
    // ========================================================================

    private UserElectionAssignmentDto toDto(
            UserElectionAssignment assignment
    ) {

        SystemUser user =
                assignment.getUser();


        String firstName =
                user.getFirstName() != null
                        ? user.getFirstName()
                        : "";


        String lastName =
                user.getLastName() != null
                        ? user.getLastName()
                        : "";


        String displayName =
                (
                        firstName
                                + " "
                                + lastName
                ).trim();


        return UserElectionAssignmentDto
                .builder()
                .assignmentId(
                        assignment.getAssignmentId()
                )
                .userId(
                        user.getUserId()
                )
                .userName(
                        user.getUserName()
                )
                .userDisplayName(
                        displayName
                )
                .orgId(
                        assignment
                                .getOrganization()
                                .getOrgId()
                )
                .orgName(
                        assignment
                                .getOrganization()
                                .getOrgName()
                )
                .electionId(
                        assignment
                                .getElection()
                                .getElectionId()
                )
                .electionName(
                        assignment
                                .getElection()
                                .getElectionName()
                )
                .scopeType(
                        assignment.getScopeType()
                )
                .countyId(
                        assignment.getCounty() != null
                                ? assignment
                                .getCounty()
                                .getCountyId()
                                : null
                )
                .countyName(
                        assignment.getCounty() != null
                                ? assignment
                                .getCounty()
                                .getCountyName()
                                : null
                )
                .districtId(
                        assignment.getDistrict() != null
                                ? assignment
                                .getDistrict()
                                .getDistrictId()
                                : null
                )
                .districtName(
                        assignment.getDistrict() != null
                                ? assignment
                                .getDistrict()
                                .getDistrictName()
                                : null
                )
                .centerId(
                        assignment.getCenter() != null
                                ? assignment
                                .getCenter()
                                .getCenterId()
                                : null
                )
                .centerName(
                        assignment.getCenter() != null
                                ? assignment
                                .getCenter()
                                .getCenterName()
                                : null
                )
                .placeId(
                        assignment.getPlace() != null
                                ? assignment
                                .getPlace()
                                .getPlaceId()
                                : null
                )
                .placeName(
                        assignment.getPlace() != null
                                ? resolvePlaceName(
                                assignment.getPlace()
                        )
                                : null
                )
                .active(
                        assignment.isActive()
                )
                .dateCreated(
                        assignment.getDateCreated()
                )
                .dateUpdated(
                        assignment.getDateUpdated()
                )
                .build();
    }


    // ========================================================================
    // PLACE DISPLAY
    // ========================================================================

    private String resolvePlaceName(
            PollingPlace place
    ) {

        if (
                place.getLabel() != null
                        &&
                        !place.getLabel().isBlank()
        ) {

            return place.getLabel();
        }


        if (
                place.getPlaceNumber() != null
        ) {

            return "Place "
                    + place.getPlaceNumber();
        }


        return place.getCode();
    }
}