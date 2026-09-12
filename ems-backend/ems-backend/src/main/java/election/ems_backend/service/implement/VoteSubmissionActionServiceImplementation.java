package election.ems_backend.service.implement;

import election.ems_backend.dto.VoteSubmissionActionDto;
import election.ems_backend.dto.VoteSubmissionActionRequest;
import election.ems_backend.entity.Organization;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.entity.VoteSubmission;
import election.ems_backend.entity.VoteSubmissionAction;
import election.ems_backend.enums.VoteSubmissionActionType;
import election.ems_backend.mapper.VoteSubmissionActionMapper;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.repository.VoteSubmissionActionRepository;
import election.ems_backend.repository.VoteSubmissionRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VoteSubmissionActionServiceImplementation {

    private final VoteSubmissionActionRepository actionRepository;

    private final VoteSubmissionRepository submissionRepository;

    private final SystemUserRepository systemUserRepository;

    private final VoteSubmissionActionMapper mapper;

    // ========================================================================
    // RECORD ACTION
    // ========================================================================

    @Transactional
    public VoteSubmissionActionDto recordAction(
            UUID submissionId,
            VoteSubmissionActionRequest request,
            HttpServletRequest httpRequest
    ) {

        if (submissionId == null) {
            throw new IllegalArgumentException(
                    "submissionId is required."
            );
        }

        if (request == null) {
            throw new IllegalArgumentException(
                    "Action request is required."
            );
        }

        if (request.getActorUserId() == null) {
            throw new IllegalArgumentException(
                    "actorUserId is required."
            );
        }

        if (request.getActionType() == null) {
            throw new IllegalArgumentException(
                    "actionType is required."
            );
        }

        VoteSubmission submission =
                submissionRepository
                        .findById(submissionId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Vote submission not found: " +
                                                submissionId
                                )
                        );

        SystemUser actor =
                systemUserRepository
                        .findById(request.getActorUserId())
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Acting user not found: " +
                                                request.getActorUserId()
                                )
                        );

        validateCertification(
                actor,
                request
        );

        Organization organization =
                submission.getOrganization();

        if (organization == null) {
            throw new IllegalStateException(
                    "Submission has no organization."
            );
        }

        VoteSubmissionAction action =
                new VoteSubmissionAction();

        action.setSubmission(
                submission
        );

        action.setOrganization(
                organization
        );

        action.setActorUser(
                actor
        );

        action.setActionType(
                request.getActionType()
        );

        action.setStatusBefore(
                clean(
                        request.getStatusBefore()
                )
        );

        action.setStatusAfter(
                clean(
                        request.getStatusAfter()
                )
        );

        action.setReason(
                clean(
                        request.getReason()
                )
        );

        action.setComments(
                clean(
                        request.getComments()
                )
        );

        action.setTypedSignature(
                clean(
                        request.getTypedSignature()
                )
        );

        action.setCertificationStatement(
                clean(
                        request.getCertificationStatement()
                )
        );

        action.setCertificationConfirmed(
                Boolean.TRUE.equals(
                        request.getCertificationConfirmed()
                )
        );

        action.setActionData(
                request.getActionData()
        );

        if (httpRequest != null) {

            action.setClientIp(
                    resolveClientIp(
                            httpRequest
                    )
            );

            action.setUserAgent(
                    clean(
                            httpRequest.getHeader(
                                    "User-Agent"
                            )
                    )
            );
        }

        VoteSubmissionAction saved =
                actionRepository.save(
                        action
                );

        return mapper.toDto(
                saved
        );
    }

    // ========================================================================
    // GET ONE ACTION
    // ========================================================================

    @Transactional
    public VoteSubmissionActionDto getAction(
            UUID actionId
    ) {

        if (actionId == null) {
            throw new IllegalArgumentException(
                    "actionId is required."
            );
        }

        VoteSubmissionAction action =
                actionRepository
                        .findById(actionId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Vote submission action not found: " +
                                                actionId
                                )
                        );

        return mapper.toDto(
                action
        );
    }

    // ========================================================================
    // OVERSIGHT — SEARCH ACTIONS
    // ========================================================================

    @Transactional
    public Page<VoteSubmissionActionDto> searchActions(
            UUID orgId,
            UUID submissionId,
            VoteSubmissionActionType actionType,
            int page,
            int size
    ) {

        int safePage =
                Math.max(
                        page,
                        0
                );

        int safeSize =
                Math.min(
                        Math.max(
                                size,
                                1
                        ),
                        100
                );

        Pageable pageable =
                PageRequest.of(
                        safePage,
                        safeSize
                );

        Page<VoteSubmissionAction> result;

        // ====================================================================
        // SUBMISSION FILTER
        // ====================================================================

        if (submissionId != null) {

            if (orgId != null) {

                result =
                        actionRepository
                                .findByOrganization_OrgIdAndSubmission_SubmissionIdOrderByActionTimeDesc(
                                        orgId,
                                        submissionId,
                                        pageable
                                );

            } else {

                result =
                        actionRepository
                                .findBySubmission_SubmissionIdOrderByActionTimeDesc(
                                        submissionId,
                                        pageable
                                );
            }

            return result.map(
                    mapper::toDto
            );
        }

        // ====================================================================
        // ACTION TYPE FILTER
        // ====================================================================

        if (actionType != null) {

            if (orgId != null) {

                result =
                        actionRepository
                                .findByOrganization_OrgIdAndActionTypeOrderByActionTimeDesc(
                                        orgId,
                                        actionType,
                                        pageable
                                );

            } else {

                result =
                        actionRepository
                                .findByActionTypeOrderByActionTimeDesc(
                                        actionType,
                                        pageable
                                );
            }

            return result.map(
                    mapper::toDto
            );
        }

        // ====================================================================
        // ALL
        // ====================================================================

        if (orgId != null) {

            result =
                    actionRepository
                            .findByOrganization_OrgIdOrderByActionTimeDesc(
                                    orgId,
                                    pageable
                            );

        } else {

            result =
                    actionRepository
                            .findAllByOrderByActionTimeDesc(
                                    pageable
                            );
        }

        return result.map(
                mapper::toDto
        );
    }

    // ========================================================================
    // LIST ONE SUBMISSION'S HISTORY
    // ========================================================================

    @Transactional
    public List<VoteSubmissionActionDto> listForSubmission(
            UUID submissionId
    ) {

        if (submissionId == null) {
            throw new IllegalArgumentException(
                    "submissionId is required."
            );
        }

        return actionRepository
                .findBySubmission_SubmissionIdOrderByActionTimeDesc(
                        submissionId
                )
                .stream()
                .map(
                        mapper::toDto
                )
                .toList();
    }

    // ========================================================================
    // COUNT
    // ========================================================================

    public long countForSubmission(
            UUID submissionId
    ) {

        if (submissionId == null) {
            throw new IllegalArgumentException(
                    "submissionId is required."
            );
        }

        return actionRepository
                .countBySubmission_SubmissionId(
                        submissionId
                );
    }

    public long countForSubmissionByType(
            UUID submissionId,
            VoteSubmissionActionType actionType
    ) {

        if (submissionId == null) {
            throw new IllegalArgumentException(
                    "submissionId is required."
            );
        }

        if (actionType == null) {
            throw new IllegalArgumentException(
                    "actionType is required."
            );
        }

        return actionRepository
                .countBySubmission_SubmissionIdAndActionType(
                        submissionId,
                        actionType
                );
    }

    // ========================================================================
    // CERTIFICATION
    // ========================================================================

    private void validateCertification(
            SystemUser actor,
            VoteSubmissionActionRequest request
    ) {

        VoteSubmissionActionType actionType = request.getActionType();

        // EDIT is authenticated and its exact vote-data changes are recorded.
        // DELETE keeps its existing destructive-confirmation workflow.
        if (
                actionType == VoteSubmissionActionType.EDIT ||
                        actionType == VoteSubmissionActionType.DELETE
        ) {
            return;
        }

        if (!Boolean.TRUE.equals(request.getCertificationConfirmed())) {
            throw new IllegalArgumentException(
                    "Certification must be confirmed."
            );
        }

        String expectedName = resolveUserName(actor);
        String typedSignature = clean(request.getTypedSignature());

        if (expectedName == null || expectedName.isBlank()) {
            throw new IllegalStateException(
                    "Authenticated user does not have a valid account name for certification."
            );
        }

        if (typedSignature == null || typedSignature.isBlank()) {
            throw new IllegalArgumentException(
                    "Typed signature is required."
            );
        }

        if (!expectedName.equalsIgnoreCase(typedSignature)) {
            throw new IllegalArgumentException(
                    "Typed signature does not match the authenticated user's account name."
            );
        }

        if (clean(request.getCertificationStatement()) == null) {
            throw new IllegalArgumentException(
                    "Certification statement is required."
            );
        }
    }


    // ========================================================================
    // VOTE DATA SNAPSHOT
    // ========================================================================

    public Map<String, Object> captureVoteData(
            VoteSubmission submission
    ) {

        if (submission == null) {
            return Collections.emptyMap();
        }

        Map<String, Object> snapshot = new LinkedHashMap<>();

        snapshot.put(
                "candidateVotes",
                submission.getCandidateVotes() == null
                        ? Collections.emptyMap()
                        : new LinkedHashMap<>(submission.getCandidateVotes())
        );
        snapshot.put("ballotsReceived", submission.getBallotsReceived());
        snapshot.put("ballotsInBox", submission.getBallotsInBox());
        snapshot.put("invalidBallots", submission.getInvalidBallots());
        snapshot.put("unmarkedBallots", submission.getUnmarkedBallots());
        snapshot.put("rejectedBallots", submission.getRejectedBallots());
        snapshot.put("spoiledBallots", submission.getSpoiledBallots());
        snapshot.put("unusedBallots", submission.getUnusedBallots());

        return snapshot;
    }


    // ========================================================================
    // VOTE DATA CHANGES
    // ========================================================================

    @SuppressWarnings("unchecked")
    public Map<String, Object> buildVoteDataChanges(
            Map<String, Object> before,
            Map<String, Object> after
    ) {

        Map<String, Object> changes = new LinkedHashMap<>();

        Map<String, Integer> beforeVotes =
                before != null && before.get("candidateVotes") instanceof Map
                        ? (Map<String, Integer>) before.get("candidateVotes")
                        : Collections.emptyMap();

        Map<String, Integer> afterVotes =
                after != null && after.get("candidateVotes") instanceof Map
                        ? (Map<String, Integer>) after.get("candidateVotes")
                        : Collections.emptyMap();

        Set<String> candidateIds = new LinkedHashSet<>();
        candidateIds.addAll(beforeVotes.keySet());
        candidateIds.addAll(afterVotes.keySet());

        Map<String, Object> candidateChanges = new LinkedHashMap<>();

        for (String candidateId : candidateIds) {
            int beforeValue = beforeVotes.getOrDefault(candidateId, 0);
            int afterValue = afterVotes.getOrDefault(candidateId, 0);

            if (beforeValue == afterValue) {
                continue;
            }

            Map<String, Object> change = new LinkedHashMap<>();
            change.put("before", beforeValue);
            change.put("after", afterValue);
            change.put("delta", afterValue - beforeValue);
            candidateChanges.put(candidateId, change);
        }

        if (!candidateChanges.isEmpty()) {
            changes.put("candidateVotes", candidateChanges);
        }

        String[] trackedFields = {
                "ballotsReceived",
                "ballotsInBox",
                "invalidBallots",
                "unmarkedBallots",
                "rejectedBallots",
                "spoiledBallots",
                "unusedBallots"
        };

        for (String field : trackedFields) {
            Object beforeValue = before != null ? before.get(field) : null;
            Object afterValue = after != null ? after.get(field) : null;

            if (Objects.equals(beforeValue, afterValue)) {
                continue;
            }

            Map<String, Object> change = new LinkedHashMap<>();
            change.put("before", beforeValue);
            change.put("after", afterValue);

            if (beforeValue instanceof Number beforeNumber &&
                    afterValue instanceof Number afterNumber) {
                change.put(
                        "delta",
                        afterNumber.intValue() - beforeNumber.intValue()
                );
            }

            changes.put(field, change);
        }

        return changes;
    }


    // ========================================================================
    // VOTE DATA ACTION PAYLOAD
    // ========================================================================

    public Map<String, Object> buildVoteDataActionData(
            Map<String, Object> before,
            VoteSubmission afterSubmission
    ) {

        Map<String, Object> safeBefore =
                before == null
                        ? Collections.emptyMap()
                        : new LinkedHashMap<>(before);

        Map<String, Object> after = captureVoteData(afterSubmission);
        Map<String, Object> changes = buildVoteDataChanges(safeBefore, after);

        Map<String, Object> actionData = new LinkedHashMap<>();
        actionData.put("before", safeBefore);
        actionData.put("after", after);
        actionData.put("changes", changes);
        actionData.put("changedFieldCount", changes.size());

        return actionData;
    }


    public boolean hasVoteDataChanges(
            Map<String, Object> before,
            VoteSubmission afterSubmission
    ) {
        return !buildVoteDataChanges(
                before,
                captureVoteData(afterSubmission)
        ).isEmpty();
    }


    // ========================================================================
    // RECORD VOTE-DATA CHANGE ACTION
    // ========================================================================

    @Transactional
    public VoteSubmissionActionDto recordVoteDataChange(
            UUID submissionId,
            UUID actorUserId,
            VoteSubmissionActionType actionType,
            String statusBefore,
            String statusAfter,
            String reason,
            String comments,
            String typedSignature,
            String certificationStatement,
            Boolean certificationConfirmed,
            Map<String, Object> beforeSnapshot,
            VoteSubmission afterSubmission,
            HttpServletRequest httpRequest
    ) {

        if (
                actionType != VoteSubmissionActionType.EDIT &&
                        actionType != VoteSubmissionActionType.AMEND &&
                        actionType != VoteSubmissionActionType.RESUBMIT
        ) {
            throw new IllegalArgumentException(
                    "Vote-data change history is supported only for EDIT, AMEND, or RESUBMIT."
            );
        }

        VoteSubmissionActionRequest request = new VoteSubmissionActionRequest();
        request.setActorUserId(actorUserId);
        request.setActionType(actionType);
        request.setStatusBefore(statusBefore);
        request.setStatusAfter(statusAfter);
        request.setReason(reason);
        request.setComments(comments);
        request.setTypedSignature(typedSignature);
        request.setCertificationStatement(certificationStatement);
        request.setCertificationConfirmed(certificationConfirmed);
        request.setActionData(
                buildVoteDataActionData(
                        beforeSnapshot,
                        afterSubmission
                )
        );

        return recordAction(
                submissionId,
                request,
                httpRequest
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

        StringBuilder builder =
                new StringBuilder();

        appendName(
                builder,
                firstName
        );

        appendName(
                builder,
                lastName
        );

        String fullName =
                builder
                        .toString()
                        .trim();

        if (!fullName.isBlank()) {
            return fullName;
        }

        return clean(
                user.getUserName()
        );
    }

    private void appendName(
            StringBuilder builder,
            String value
    ) {

        if (
                value == null ||
                        value.isBlank()
        ) {
            return;
        }

        if (!builder.isEmpty()) {
            builder.append(" ");
        }

        builder.append(
                value
        );
    }

    // ========================================================================
    // CLIENT IP
    // ========================================================================

    private String resolveClientIp(
            HttpServletRequest request
    ) {

        String forwarded =
                request.getHeader(
                        "X-Forwarded-For"
                );

        if (
                forwarded != null &&
                        !forwarded.isBlank()
        ) {

            String first =
                    forwarded
                            .split(",")[0]
                            .trim();

            if (!first.isBlank()) {
                return first;
            }
        }

        return request.getRemoteAddr();
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
