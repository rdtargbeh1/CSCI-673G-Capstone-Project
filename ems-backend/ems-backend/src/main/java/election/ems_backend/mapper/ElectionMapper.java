package election.ems_backend.mapper;

import election.ems_backend.dto.ElectionCreateRequest;
import election.ems_backend.dto.ElectionDto;
import election.ems_backend.dto.ElectionUpdateRequest;
import election.ems_backend.entity.Election;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.repository.SystemUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ElectionMapper {

    private final SystemUserRepository systemUserRepository;


    // ========================================================================
    // ENTITY -> DTO
    // ========================================================================

    public ElectionDto toDTO(
            Election election
    ) {

        if (election == null) {
            return null;
        }


        return ElectionDto.builder()

                // ============================================================
                // ELECTION
                // ============================================================

                .electionId(
                        election.getElectionId()
                )

                .electionName(
                        election.getElectionName()
                )

                .year(
                        election.getYear()
                )

                .electionType(
                        election.getElectionType()
                )

                .isActive(
                        election.isActive()
                )


                // ============================================================
                // BALLOT POLICY
                // ============================================================

                .ballotSparePercent(
                        election.getBallotSparePercent()
                )

                .enforceBallotsGteRegistered(
                        election.isEnforceBallotsGteRegistered()
                )


                // ============================================================
                // AUDIT DATES
                // ============================================================

                .dateCreated(
                        election.getDateCreated()
                )

                .dateUpdated(
                        election.getDateUpdated()
                )


                // ============================================================
                // AUDIT USERS
                // ============================================================

                .createdBy(
                        election.getCreatedBy()
                )

                .createdByName(
                        resolveUserName(
                                election.getCreatedBy()
                        )
                )

                .updatedBy(
                        election.getUpdatedBy()
                )

                .updatedByName(
                        resolveUserName(
                                election.getUpdatedBy()
                        )
                )

                .build();
    }


    // ========================================================================
    // CREATE REQUEST -> ENTITY
    // ========================================================================

    public Election toEntity(
            ElectionCreateRequest req
    ) {

        if (req == null) {
            return null;
        }


        boolean enforce =
                req.getEnforceBallotsGteRegistered() == null
                        ? true
                        : req.getEnforceBallotsGteRegistered();


        return Election.builder()

                .electionName(
                        req.getElectionName()
                )

                .year(
                        req.getYear()
                )

                .electionType(
                        req.getElectionType()
                )

                .isActive(
                        req.isActive()
                )

                .ballotSparePercent(
                        req.getBallotSparePercent()
                )

                .enforceBallotsGteRegistered(
                        enforce
                )

                .build();
    }


    // ========================================================================
    // APPLY UPDATE
    // ========================================================================

    public void apply(
            ElectionUpdateRequest req,
            Election election
    ) {

        if (
                req == null ||
                        election == null
        ) {
            return;
        }


        if (
                req.getElectionName() != null
        ) {
            election.setElectionName(
                    req.getElectionName()
            );
        }


        if (
                req.getYear() != null
        ) {
            election.setYear(
                    req.getYear()
            );
        }


        if (
                req.getElectionType() != null
        ) {
            election.setElectionType(
                    req.getElectionType()
            );
        }


        if (
                req.getIsActive() != null
        ) {
            election.setActive(
                    req.getIsActive()
            );
        }


        if (
                req.getBallotSparePercent() != null
        ) {
            election.setBallotSparePercent(
                    req.getBallotSparePercent()
            );
        }


        if (
                req.getEnforceBallotsGteRegistered() != null
        ) {
            election.setEnforceBallotsGteRegistered(
                    req.getEnforceBallotsGteRegistered()
            );
        }
    }


    // ========================================================================
    // RESOLVE AUDIT USER
    // ========================================================================

    private String resolveUserName(
            String auditValue
    ) {

        if (
                auditValue == null ||
                        auditValue.isBlank()
        ) {
            return null;
        }


        String normalized =
                auditValue.trim();


        /*
         * Current auditing may store the authenticated SystemUser UUID
         * as a String.
         *
         * Resolve that UUID to the actual user's display name.
         */
        try {

            UUID userId =
                    UUID.fromString(
                            normalized
                    );


            return systemUserRepository
                    .findById(
                            userId
                    )
                    .map(
                            this::buildDisplayName
                    )
                    .orElse(
                            normalized
                    );

        } catch (
                IllegalArgumentException ignored
        ) {

            /*
             * Future-proofing:
             *
             * If AuditorAware later stores a username instead of a UUID,
             * this method will simply return that username.
             */
            return normalized;
        }
    }


    // ========================================================================
    // USER DISPLAY NAME
    // ========================================================================

    private String buildDisplayName(
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
                        firstName
                                + " "
                                + lastName
                ).trim();


        /*
         * Priority:
         *
         * 1. First Name + Last Name
         * 2. Username
         * 3. Email
         * 4. UUID only as final fallback
         */

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