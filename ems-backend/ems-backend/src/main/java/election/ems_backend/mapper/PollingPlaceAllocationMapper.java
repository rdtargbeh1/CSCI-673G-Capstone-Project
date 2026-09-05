package election.ems_backend.mapper;

import election.ems_backend.dto.PollingPlaceAllocationCreateRequest;
import election.ems_backend.dto.PollingPlaceAllocationDto;
import election.ems_backend.dto.PollingPlaceAllocationUpdateRequest;
import election.ems_backend.entity.Election;
import election.ems_backend.entity.PollingCenter;
import election.ems_backend.entity.PollingPlace;
import election.ems_backend.entity.PollingPlaceAllocation;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.repository.SystemUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class PollingPlaceAllocationMapper {

    private final SystemUserRepository systemUserRepository;


    // ========================================================================
    // CREATE ENTITY
    // ========================================================================

    public PollingPlaceAllocation toEntity(
            PollingPlaceAllocationCreateRequest req,
            Election election,
            PollingPlace place
    ) {

        return PollingPlaceAllocation.builder()
                .election(election)
                .pollingPlace(place)
                .registeredVoters(req.getRegisteredVoters())
                .ballotsIssued(
                        req.getBallotsIssued() != null
                                ? req.getBallotsIssued()
                                : 0
                )
                .build();
    }


    // ========================================================================
    // APPLY UPDATE
    // ========================================================================

    public void apply(
            PollingPlaceAllocationUpdateRequest req,
            PollingPlaceAllocation entity
    ) {

        if (req == null || entity == null) {
            return;
        }


        if (req.getRegisteredVoters() != null) {
            entity.setRegisteredVoters(
                    req.getRegisteredVoters()
            );
        }


        if (req.getBallotsIssued() != null) {
            entity.setBallotsIssued(
                    req.getBallotsIssued()
            );
        }
    }


    // ========================================================================
    // DTO
    // ========================================================================

    public PollingPlaceAllocationDto toDTO(
            PollingPlaceAllocation allocation
    ) {

        if (allocation == null) {
            return null;
        }


        Election election =
                allocation.getElection();


        PollingPlace place =
                allocation.getPollingPlace();


        PollingCenter center =
                place != null
                        ? place.getPollingCenter()
                        : null;


        return PollingPlaceAllocationDto.builder()

                // ============================================================
                // ALLOCATION
                // ============================================================

                .placeAllocationId(
                        allocation.getPlaceAllocationId()
                )


                // ============================================================
                // ELECTION
                // ============================================================

                .electionId(
                        election != null
                                ? election.getElectionId()
                                : null
                )

                .electionName(
                        election != null
                                ? election.getElectionName()
                                : null
                )

                .year(
                        election != null
                                ? election.getYear()
                                : 0
                )


                // ============================================================
                // POLLING PLACE
                // ============================================================

                .placeId(
                        place != null
                                ? place.getPlaceId()
                                : null
                )

                .placeCode(
                        place != null
                                ? place.getCode()
                                : null
                )

                .placeNumber(
                        place != null
                                ? place.getPlaceNumber()
                                : null
                )

                .placeLabel(
                        place != null
                                ? place.getLabel()
                                : null
                )


                // ============================================================
                // POLLING CENTER
                // ============================================================

                .centerId(
                        center != null
                                ? center.getCenterId()
                                : null
                )

                .centerCode(
                        center != null
                                ? center.getCode()
                                : null
                )

                .centerName(
                        center != null
                                ? center.getCenterName()
                                : null
                )


                // ============================================================
                // ALLOCATION VALUES
                // ============================================================

                .registeredVoters(
                        allocation.getRegisteredVoters()
                )

                .ballotsIssued(
                        allocation.getBallotsIssued()
                )


                // ============================================================
                // AUDIT
                // ============================================================

                .dateCreated(
                        allocation.getDateCreated()
                )

                .dateUpdated(
                        allocation.getDateUpdated()
                )

                .createdBy(
                        allocation.getCreatedBy()
                )

                .createdByName(
                        resolveUserName(
                                allocation.getCreatedBy()
                        )
                )

                .updatedBy(
                        allocation.getUpdatedBy()
                )

                .updatedByName(
                        resolveUserName(
                                allocation.getUpdatedBy()
                        )
                )

                .active(
                        allocation.isActive()
                )

                .version(
                        allocation.getVersion()
                )

                .build();
    }


    // ========================================================================
    // USER DISPLAY NAME
    // ========================================================================

    private String resolveUserName(
            String auditUserId
    ) {

        if (
                auditUserId == null ||
                        auditUserId.isBlank()
        ) {
            return null;
        }


        try {

            UUID userId =
                    UUID.fromString(
                            auditUserId.trim()
                    );


            return systemUserRepository
                    .findById(userId)
                    .map(this::displayName)
                    .orElse(auditUserId);

        } catch (IllegalArgumentException ex) {

            // Auditor may someday store a username instead of UUID.
            // If so, preserve the original value instead of failing.
            return auditUserId;
        }
    }


    private String displayName(
            SystemUser user
    ) {

        if (user == null) {
            return null;
        }


        String firstName =
                user.getFirstName() != null
                        ? user.getFirstName().trim()
                        : "";


        String lastName =
                user.getLastName() != null
                        ? user.getLastName().trim()
                        : "";


        String fullName =
                (
                        firstName +
                                " " +
                                lastName
                ).trim();


        if (!fullName.isBlank()) {
            return fullName;
        }


        if (
                user.getUserName() != null &&
                        !user.getUserName().isBlank()
        ) {
            return user.getUserName();
        }


        if (
                user.getEmail() != null &&
                        !user.getEmail().isBlank()
        ) {
            return user.getEmail();
        }


        return user.getUserId() != null
                ? user.getUserId().toString()
                : null;
    }
}