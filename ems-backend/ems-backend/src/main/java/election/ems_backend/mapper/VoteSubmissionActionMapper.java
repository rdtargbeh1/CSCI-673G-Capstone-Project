package election.ems_backend.mapper;

import election.ems_backend.dto.VoteSubmissionActionDto;
import election.ems_backend.entity.Contest;
import election.ems_backend.entity.County;
import election.ems_backend.entity.District;
import election.ems_backend.entity.Election;
import election.ems_backend.entity.PollingCenter;
import election.ems_backend.entity.PollingPlace;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.entity.VoteSubmission;
import election.ems_backend.entity.VoteSubmissionAction;

import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Map;

@Component
public class VoteSubmissionActionMapper {

    public VoteSubmissionActionDto toDto(
            VoteSubmissionAction entity
    ) {

        VoteSubmissionActionDto dto =
                new VoteSubmissionActionDto();

        // ====================================================================
        // ACTION
        // ====================================================================

        dto.setActionId(
                entity.getActionId()
        );

        dto.setActionType(
                entity.getActionType()
        );

        dto.setStatusBefore(
                entity.getStatusBefore()
        );

        dto.setStatusAfter(
                entity.getStatusAfter()
        );

        dto.setActionTime(
                entity.getActionTime()
        );

        dto.setDateCreated(
                entity.getDateCreated()
        );

        // ====================================================================
        // ORGANIZATION
        // ====================================================================

        if (entity.getOrganization() != null) {

            dto.setOrgId(
                    entity
                            .getOrganization()
                            .getOrgId()
            );
        }

        // ====================================================================
        // SUBMISSION CONTEXT
        // ====================================================================

        VoteSubmission submission =
                entity.getSubmission();

        if (submission != null) {

            dto.setSubmissionId(
                    submission.getSubmissionId()
            );

            // ================================================================
            // ELECTION
            // ================================================================

            Election election =
                    submission.getElection();

            if (election != null) {

                dto.setElectionId(
                        election.getElectionId()
                );

                dto.setElectionName(
                        resolveElectionName(
                                election
                        )
                );
            }

            // ================================================================
            // CONTEST
            // ================================================================

            Contest contest =
                    submission.getContest();

            if (contest != null) {

                dto.setContestId(
                        contest.getContestId()
                );

                dto.setContestName(
                        resolveContestName(
                                contest
                        )
                );
            }

            // ================================================================
            // POLLING CENTER
            // ================================================================

            PollingCenter center =
                    submission.getPollingCenter();

            if (center != null) {

                dto.setCenterId(
                        center.getCenterId()
                );

                dto.setCenterName(
                        clean(
                                center.getCenterName()
                        )
                );

                dto.setCenterCode(
                        clean(
                                center.getCode()
                        )
                );

                // ============================================================
                // DISTRICT
                // ============================================================

                District district =
                        center.getDistrict();

                if (district != null) {

                    dto.setDistrictId(
                            district.getDistrictId()
                    );

                    dto.setDistrictName(
                            clean(
                                    district.getDistrictName()
                            )
                    );

                    // ========================================================
                    // COUNTY
                    // ========================================================

                    County county =
                            district.getCounty();

                    if (county != null) {

                        dto.setCountyId(
                                county.getCountyId()
                        );

                        dto.setCountyName(
                                clean(
                                        county.getCountyName()
                                )
                        );
                    }
                }
            }

            // ================================================================
            // POLLING PLACE
            // ================================================================

            PollingPlace place =
                    submission.getPollingPlace();

            if (place != null) {

                dto.setPlaceId(
                        place.getPlaceId()
                );

                dto.setPlaceCode(
                        clean(
                                place.getCode()
                        )
                );

                dto.setPlaceNumber(
                        place.getPlaceNumber()
                );

                dto.setPlaceLabel(
                        resolvePlaceLabel(
                                place
                        )
                );
            }
        }

        // ====================================================================
        // ACTOR
        // ====================================================================

        if (entity.getActorUser() != null) {

            dto.setActorUserId(
                    entity
                            .getActorUser()
                            .getUserId()
            );

            dto.setActorName(
                    resolveUserName(
                            entity.getActorUser()
                    )
            );
        }

        // ====================================================================
        // REASON / COMMENTS
        // ====================================================================

        dto.setReason(
                entity.getReason()
        );

        dto.setComments(
                entity.getComments()
        );

        // ====================================================================
        // CERTIFICATION
        // ====================================================================

        dto.setTypedSignature(
                entity.getTypedSignature()
        );

        dto.setCertificationStatement(
                entity.getCertificationStatement()
        );

        dto.setCertificationConfirmed(
                Boolean.TRUE.equals(
                        entity.getCertificationConfirmed()
                )
        );

        // ====================================================================
        // TECHNICAL AUDIT
        // ====================================================================

        dto.setClientIp(
                entity.getClientIp()
        );

        dto.setUserAgent(
                entity.getUserAgent()
        );

        // ====================================================================
        // ACTION DATA
        // ====================================================================

        dto.setActionData(
                safeActionData(
                        entity.getActionData()
                )
        );

        return dto;
    }

    // ========================================================================
    // ACTION DATA
    // ========================================================================

    private Map<String, Object> safeActionData(
            Map<String, Object> actionData
    ) {

        if (
                actionData == null ||
                        actionData.isEmpty()
        ) {
            return Collections.emptyMap();
        }

        return actionData;
    }

    // ========================================================================
    // ELECTION NAME
    // ========================================================================

    private String resolveElectionName(
            Election election
    ) {

        if (election == null) {
            return null;
        }

        return clean(
                election.getElectionName()
        );
    }

    // ========================================================================
    // CONTEST NAME
    // ========================================================================

    private String resolveContestName(
            Contest contest
    ) {

        if (contest == null) {
            return null;
        }

        return clean(
                contest.getContestName()
        );
    }

    // ========================================================================
    // POLLING PLACE LABEL
    // ========================================================================

    private String resolvePlaceLabel(
            PollingPlace place
    ) {

        if (place == null) {
            return null;
        }

        String label =
                clean(
                        place.getLabel()
                );

        if (label != null) {
            return label;
        }

        if (place.getPlaceNumber() != null) {

            return "Place " +
                    place.getPlaceNumber();
        }

        return clean(
                place.getCode()
        );
    }

    // ========================================================================
    // USER NAME
    // ========================================================================

    private String resolveUserName(
            SystemUser user
    ) {

        if (user == null) {
            return null;
        }

        String firstName =
                clean(
                        user.getFirstName()
                );

        String lastName =
                clean(
                        user.getLastName()
                );

        String fullName =
                String.join(
                                " ",
                                java.util.stream.Stream
                                        .of(
                                                firstName,
                                                lastName
                                        )
                                        .filter(
                                                value ->
                                                        value != null &&
                                                                !value.isBlank()
                                        )
                                        .toList()
                        )
                        .trim();

        if (!fullName.isBlank()) {
            return fullName;
        }

        return clean(
                user.getUserName()
        );
    }

    // ========================================================================
    // CLEAN
    // ========================================================================

    private String clean(
            String value
    ) {

        if (value == null) {
            return null;
        }

        String cleaned =
                value.trim();

        return cleaned.isBlank()
                ? null
                : cleaned;
    }
}