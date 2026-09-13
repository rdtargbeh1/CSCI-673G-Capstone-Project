package election.ems_backend.mapper;

import election.ems_backend.dto.ElectionCreateRequest;
import election.ems_backend.dto.ElectionDto;
import election.ems_backend.dto.ElectionLifecycleRequest;
import election.ems_backend.dto.ElectionUpdateRequest;
import election.ems_backend.entity.Election;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.enums.ElectionAccessStatus;
import election.ems_backend.repository.SystemUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
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
                // ACCESS / LIFECYCLE
                // ============================================================

                .accessStatus(
                        election.getAccessStatus()
                )

                .availableAt(
                        election.getAvailableAt()
                )

                .startAt(
                        election.getStartAt()
                )

                .endAt(
                        election.getEndAt()
                )

                .availableUntil(
                        election.getAvailableUntil()
                )

                .archivedAt(
                        election.getArchivedAt()
                )

                .archivedReason(
                        election.getArchivedReason()
                )


                // ============================================================
                // COMPUTED STATE
                // ============================================================

                .beforeOperationalWindow(
                        election.isBeforeOperationalWindow()
                )

                .withinOperationalWindow(
                        election.isWithinOperationalWindow()
                )

                .afterOperationalWindow(
                        election.isAfterOperationalWindow()
                )

                .archiveDue(
                        election.isArchiveDue()
                )

                .availableTimeReached(
                        election.hasReachedAvailableTime()
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


                // ============================================================
                // VERSION
                // ============================================================

                .version(
                        election.getVersion()
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
                        || req.getEnforceBallotsGteRegistered();


        return Election.builder()

                // ============================================================
                // BASIC ELECTION
                // ============================================================

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


                // ============================================================
                // NEW ELECTION DEFAULT LIFECYCLE
                // ============================================================

                /*
                 * Every newly created election begins as DRAFT.
                 *
                 * Lifecycle configuration is handled separately through
                 * ElectionLifecycleRequest.
                 */
                .accessStatus(
                        ElectionAccessStatus.DRAFT
                )


                // ============================================================
                // BALLOT POLICY
                // ============================================================

                .ballotSparePercent(
                        req.getBallotSparePercent()
                )

                .enforceBallotsGteRegistered(
                        enforce
                )

                .build();
    }


    // ========================================================================
    // APPLY NORMAL ELECTION UPDATE
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


        // ====================================================================
        // BASIC INFORMATION
        // ====================================================================

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


        // ====================================================================
        // BALLOT POLICY
        // ====================================================================

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
    // APPLY ELECTION LIFECYCLE UPDATE
    // ========================================================================

    /**
     * Applies lifecycle configuration after the service has validated:
     *
     * - allowed status transition
     * - timeline ordering
     * - caller authorization
     * - archive rules
     *
     * This mapper intentionally does not decide whether a transition is legal.
     */
    public void applyLifecycle(
            ElectionLifecycleRequest req,
            Election election
    ) {

        if (
                req == null ||
                        election == null
        ) {
            return;
        }


        // ====================================================================
        // ACCESS STATUS
        // ====================================================================

        if (
                req.getAccessStatus() != null
        ) {

            ElectionAccessStatus previousStatus =
                    election.getAccessStatus();

            ElectionAccessStatus requestedStatus =
                    req.getAccessStatus();


            election.setAccessStatus(
                    requestedStatus
            );


            /*
             * archivedAt is backend-controlled.
             *
             * When the election enters ARCHIVED, record the actual
             * transition time.
             */
            if (
                    requestedStatus == ElectionAccessStatus.ARCHIVED &&
                            previousStatus != ElectionAccessStatus.ARCHIVED
            ) {

                election.setArchivedAt(
                        LocalDateTime.now()
                );
            }


            /*
             * If an authorized service allows an election to leave
             * ARCHIVED state, clear archive metadata.
             *
             * The service must decide whether such a transition is legal.
             */
            if (
                    previousStatus == ElectionAccessStatus.ARCHIVED &&
                            requestedStatus != ElectionAccessStatus.ARCHIVED
            ) {

                election.setArchivedAt(
                        null
                );

                election.setArchivedReason(
                        null
                );
            }
        }


        // ====================================================================
        // AVAILABILITY WINDOW
        // ====================================================================

        if (
                req.getAvailableAt() != null
        ) {

            election.setAvailableAt(
                    req.getAvailableAt()
            );
        }


        // ====================================================================
        // OPERATIONAL WINDOW
        // ====================================================================

        if (
                req.getStartAt() != null
        ) {

            election.setStartAt(
                    req.getStartAt()
            );
        }


        if (
                req.getEndAt() != null
        ) {

            election.setEndAt(
                    req.getEndAt()
            );
        }


        // ====================================================================
        // FINAL AVAILABILITY / ARCHIVE DEADLINE
        // ====================================================================

        if (
                req.getAvailableUntil() != null
        ) {

            election.setAvailableUntil(
                    req.getAvailableUntil()
            );
        }


        // ====================================================================
        // ARCHIVE REASON
        // ====================================================================

        if (
                req.getArchivedReason() != null
        ) {

            election.setArchivedReason(
                    req.getArchivedReason()
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
             * this method simply returns that value.
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