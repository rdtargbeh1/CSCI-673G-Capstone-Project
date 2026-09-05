package election.ems_backend.mapper;

import election.ems_backend.dto.PollingCenterAllocationCreateRequest;
import election.ems_backend.dto.PollingCenterAllocationDto;
import election.ems_backend.dto.PollingCenterAllocationUpdateRequest;
import election.ems_backend.entity.Election;
import election.ems_backend.entity.PollingCenter;
import election.ems_backend.entity.PollingCenterAllocation;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.repository.SystemUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class PollingCenterAllocationMapper {

    private final SystemUserRepository systemUserRepository;


    public PollingCenterAllocationDto toDTO(
            PollingCenterAllocation a
    ) {

        if (a == null) {
            return null;
        }


        var e =
                a.getElection();

        var pc =
                a.getPollingCenter();

        var d =
                pc != null
                        ? pc.getDistrict()
                        : null;

        var c =
                d != null
                        ? d.getCounty()
                        : null;


        return PollingCenterAllocationDto.builder()

                // ============================================================
                // ALLOCATION
                // ============================================================

                .allocationId(
                        a.getAllocationId()
                )


                // ============================================================
                // ELECTION
                // ============================================================

                .electionId(
                        e != null
                                ? e.getElectionId()
                                : null
                )

                .electionName(
                        e != null
                                ? e.getElectionName()
                                : null
                )

                .electionYear(
                        e != null
                                ? e.getYear()
                                : null
                )


                // ============================================================
                // POLLING CENTER
                // ============================================================

                .pollingCenterId(
                        pc != null
                                ? pc.getCenterId()
                                : null
                )

                .centerCode(
                        pc != null
                                ? pc.getCode()
                                : null
                )

                .centerName(
                        pc != null
                                ? pc.getCenterName()
                                : null
                )


                // ============================================================
                // DISTRICT
                // ============================================================

                .districtId(
                        d != null
                                ? d.getDistrictId()
                                : null
                )

                .districtName(
                        d != null
                                ? d.getDistrictName()
                                : null
                )


                // ============================================================
                // COUNTY
                // ============================================================

                .countyId(
                        c != null
                                ? c.getCountyId()
                                : null
                )

                .countyName(
                        c != null
                                ? c.getCountyName()
                                : null
                )


                // ============================================================
                // ALLOCATION VALUES
                // ============================================================

                .registeredVoters(
                        a.getRegisteredVoters()
                )

                .ballotsIssued(
                        a.getBallotsIssued()
                )


                // ============================================================
                // AUDIT
                // ============================================================

                .dateCreated(
                        a.getDateCreated()
                )

                .dateUpdated(
                        a.getDateUpdated()
                )

                .createdBy(
                        a.getCreatedBy()
                )

                .createdByName(
                        resolveUserName(
                                a.getCreatedBy()
                        )
                )

                .updatedBy(
                        a.getUpdatedBy()
                )

                .updatedByName(
                        resolveUserName(
                                a.getUpdatedBy()
                        )
                )

                .active(
                        a.isActive()
                )


                .build();
    }


    // ========================================================================
    // USER NAME RESOLUTION
    // ========================================================================

    private String resolveUserName(
            String userId
    ) {

        if (
                userId == null ||
                        userId.isBlank()
        ) {
            return null;
        }


        try {

            UUID id =
                    UUID.fromString(
                            userId.trim()
                    );


            return systemUserRepository
                    .findById(id)
                    .map(
                            this::buildDisplayName
                    )
                    .orElse(userId);

        } catch (
                IllegalArgumentException ex
        ) {

            return userId;
        }
    }


    private String buildDisplayName(
            SystemUser user
    ) {

        if (user == null) {
            return null;
        }


        String firstName =
                user.getFirstName();

        String lastName =
                user.getLastName();


        String fullName =
                (
                        safe(firstName)
                                + " "
                                + safe(lastName)
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


    private String safe(
            String value
    ) {

        return value == null
                ? ""
                : value.trim();
    }


    // ========================================================================
    // CREATE ENTITY
    // ========================================================================

    public PollingCenterAllocation toEntity(
            PollingCenterAllocationCreateRequest req,
            Election e,
            PollingCenter pc
    ) {

        var a =
                new PollingCenterAllocation();


        a.setElection(
                e
        );

        a.setPollingCenter(
                pc
        );

        a.setRegisteredVoters(
                req.getRegisteredVoters()
        );

        a.setBallotsIssued(
                req.getBallotsIssued()
        );


        return a;
    }


    // ========================================================================
    // APPLY UPDATE
    // ========================================================================

    public void apply(
            PollingCenterAllocationUpdateRequest req,
            PollingCenterAllocation a
    ) {

        if (
                req == null ||
                        a == null
        ) {
            return;
        }


        if (
                req.getRegisteredVoters() != null
        ) {

            a.setRegisteredVoters(
                    req.getRegisteredVoters()
            );
        }


        if (
                req.getBallotsIssued() != null
        ) {

            a.setBallotsIssued(
                    req.getBallotsIssued()
            );
        }
    }
}