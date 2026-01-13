package election.ems_backend.service.implement;

import com.fasterxml.jackson.databind.ObjectMapper;
import election.ems_backend.dto.*;
import election.ems_backend.entity.*;
import election.ems_backend.enums.DeliveryMethod;
import election.ems_backend.enums.NotificationPriority;
import election.ems_backend.enums.NotificationType;
import election.ems_backend.enums.VoteStatus;
import election.ems_backend.repository.ElectionRepository;
import election.ems_backend.repository.OrganizationRepository;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.repository.VoteSubmissionRepository;
import election.ems_backend.service.AuditLogService;
import election.ems_backend.service.NotificationService;
import election.ems_backend.service.VoteSubmissionService;
import election.ems_backend.utility.RecomputeEvent;
import jakarta.persistence.EntityManager;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.*;

/**
 * VoteSubmissionServiceImplementation
 *
 * Responsibilities:
 * - Validate submission payloads (counts, allocation)
 * - Persist submissions with duplicate detection (submissionHash) and optional idempotency key
 * - Attach files (tally sheets)
 * - Create an audit_ledger entry and record chain_hash, then sign chain_hash (via SigningService)
 * - Support updates with optimistic-lock retry
 * - Verify submissions (mark VERIFIED/REJECTED) and trigger tally recompute (synchronous here)
 *
 * Notes about changes vs previous implementation:
 * - Adds optimistic locking handling and retry in update() to reduce lost-update conflicts.
 * - Adds atomic ledger insertion + chain_hash update using fn_log_ledger_and_update_submission via JdbcTemplate,
 *   then signs the chain_hash via a SigningService (KMS-backed implementation expected in prod).
 * - Keeps existing validation, file handling, notifications and audit_log calls.
 *
 * Operational note:
 * - For heavy election-day load, consider moving recomputeForElection to an async worker to avoid long transactions.
 */

@Service
@RequiredArgsConstructor
public class VoteSubmissionServiceImplementation implements VoteSubmissionService {


    private final EntityManager em;

    private final VoteSubmissionRepository voteSubmissionRepository;
    private final OrganizationRepository orgRepo;
    private final ElectionRepository electionRepo;
    private final SystemUserRepository userRepo;
    private final PollingCenterRepository centerRepo;
    private final PollingPlaceRepository placeRepo;
    private final PollingPlaceAllocationRepository placeAllocationRepo;
    private final ContestRepository contestRepo;
    private final ContestOptionRepository contestOptionRepo;

    private final NotificationService notificationService;
    private final FileUploadService fileUploadService;
    private final TallySheetRepository tallySheetRepository;
    private final AuditLogService auditLogService;

    private final VoteSubmissionMapper mapper;

    private final JdbcTemplate jdbc;
    private final SigningService signingService;
    private final ApplicationEventPublisher eventPublisher;

    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
    private static final Logger log = LoggerFactory.getLogger(VoteSubmissionServiceImplementation.class);

    private static final int OPTIMISTIC_LOCK_RETRIES = 3;
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final int MAX_CANDIDATE_KEYS = 2000;

    // ------------------------------------------------------------------------
    // Create
    // ------------------------------------------------------------------------

    @Override
    @Transactional
    public VoteSubmissionDto create(VoteSubmissionCreateRequest req, List<MultipartFile> files, HttpServletRequest request) {
        return createInternal(req, files, request);
    }

    @Override
    @Transactional
    public VoteSubmissionDto create(VoteSubmissionCreateRequest req, HttpServletRequest request) {
        return createInternal(req, null, request);
    }

    private VoteSubmissionDto createInternal(VoteSubmissionCreateRequest req,
                                             List<MultipartFile> files,
                                             HttpServletRequest request) {

        if (req == null) throw new ResponseStatusException(BAD_REQUEST, "Request body is required");

        // ✅ DRAFT intent (boolean command, state stored in enum)
        final boolean isDraft = Boolean.TRUE.equals(req.getDraft());

        // ---------------------------
        // 1) Hard validations (prevent JPA "id must not be null")
        // ---------------------------
        if (req.getOrgId() == null) throw new ResponseStatusException(BAD_REQUEST, "orgId is required");
        if (req.getElectionId() == null) throw new ResponseStatusException(BAD_REQUEST, "electionId is required");
        if (req.getCenterId() == null) throw new ResponseStatusException(BAD_REQUEST, "centerId is required");
        if (req.getPlaceId() == null) throw new ResponseStatusException(BAD_REQUEST, "placeId is required");
        if (req.getContestId() == null) throw new ResponseStatusException(BAD_REQUEST, "contestId is required");

        // If you still allow UI to send agentId, keep it optional:
        UUID agentId = (req.getAgentId() != null) ? req.getAgentId() : resolveCurrentUserId();
        if (agentId == null) {
            throw new ResponseStatusException(BAD_REQUEST, "agentId is required");
        }

        // ✅ Draft can be partial: only enforce ballotsCast when NOT draft
        boolean hasVotes = req.getCandidateVotes() != null && !req.getCandidateVotes().isEmpty();
        if (!isDraft && hasVotes && req.getBallotsCast() == null) {
            throw new ResponseStatusException(BAD_REQUEST, "ballotsCast is required when submitting candidateVotes");
        }

        // ---------------------------
        // 2) Fetch references (now safe: IDs are non-null)
        // ---------------------------
        Organization org = orgRepo.findById(req.getOrgId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Organization not found"));

        Election e = electionRepo.findById(req.getElectionId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Election not found"));

        PollingCenter c = centerRepo.findById(req.getCenterId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Polling center not found"));

        SystemUser agent = userRepo.findById(agentId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Agent not found"));

        PollingPlace p = placeRepo.findById(req.getPlaceId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Polling place not found"));

        if (p.getPollingCenter() == null || p.getPollingCenter().getCenterId() == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Polling place is missing polling center reference");
        }
        if (!p.getPollingCenter().getCenterId().equals(c.getCenterId())) {
            throw new ResponseStatusException(BAD_REQUEST, "Polling place does not belong to the specified polling center");
        }

        // Ensure polling place is allocated for the election
        var alloc = placeAllocationRepo
                .findByElection_ElectionIdAndPollingPlace_PlaceId(e.getElectionId(), p.getPlaceId())
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Polling place not allocated for this election"));

        // ✅ contest must exist and belong to election
        Contest contest = contestRepo.findById(req.getContestId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Contest not found"));

        if (!contest.getElectionId().equals(e.getElectionId())) {
            throw new ResponseStatusException(BAD_REQUEST, "Contest does not belong to the specified election");
        }
        if (!contest.isActive()) {
            throw new ResponseStatusException(BAD_REQUEST, "Contest is not active");
        }

        // ✅ One submission per (org, election, place, contest) unless soft-deleted
        // NOTE: drafts also block duplicates (same as normal) to avoid multiple drafts per place/contest
        boolean alreadyExists = voteSubmissionRepository
                .existsByOrganization_OrgIdAndElection_ElectionIdAndPollingPlace_PlaceIdAndContestIdAndDateDeletedIsNull(
                        org.getOrgId(), e.getElectionId(), p.getPlaceId(), req.getContestId()
                );
        if (alreadyExists) {
            throw new ResponseStatusException(
                    CONFLICT,
                    "Submission already exists for this polling place and contest. Update the existing submission instead."
            );
        }

        if (req.getCandidateVotes() != null && req.getCandidateVotes().size() > MAX_CANDIDATE_KEYS) {
            throw new ResponseStatusException(BAD_REQUEST, "Too many candidate entries");
        }

        // ✅ Strict validations ONLY when not draft
        if (!isDraft) {
            validateCandidateVotes(
                    org.getOrgId(),
                    e.getElectionId(),
                    req.getContestId(),
                    req.getCandidateVotes(),
                    req.getBallotsCast()
            );

            validateTally(
                    req.getCandidateVotes(),
                    nz(req.getInvalidBallots()),
                    nz(req.getUnmarkedBallots()),
                    nz(req.getRejectedBallots()),
                    nz(req.getSpoiledBallots()),
                    nz(req.getUnusedBallots()),
                    nz(req.getBallotsCast()),
                    alloc.getRegisteredVoters(),
                    alloc.getBallotsIssued()
            );
        }

        // ---------------------------
        // 3) Build entity
        // ---------------------------
        VoteSubmission s = mapper.toEntity(req, org, e, c, agent);
        s.setPollingPlace(p);

        // ✅ Ensure DB-required fields always set (draft-safe)
        if (s.getCandidateVotes() == null) s.setCandidateVotes(new HashMap<>());
        if (s.getBallotsCast() == null) s.setBallotsCast(0);

        // ✅ Status set by intent
        s.setStatus(isDraft ? VoteStatus.DRAFT : VoteStatus.PENDING);

        // Request-derived fields
        if (request != null) {
            s.setClientIp(RequestUtils.getClientIp(request));
            s.setUserAgent(RequestUtils.getUserAgent(request));
        }
        if (req.getLatitude() != null && req.getLongitude() != null) {
            Point gps = geometryFactory.createPoint(new Coordinate(req.getLongitude(), req.getLatitude()));
            gps.setSRID(4326);
            s.setGpsLocation(gps);
        }

        // Idempotency key check (global uniqueness)
        if (req.getIdempotencyKey() != null && !req.getIdempotencyKey().isBlank()) {
            voteSubmissionRepository.findByIdempotencyKey(req.getIdempotencyKey()).ifPresent(existing -> {
                throw new ResponseStatusException(CONFLICT,
                        "Submission with this idempotency key already exists: " + existing.getSubmissionId());
            });
            s.setIdempotencyKey(req.getIdempotencyKey());
        }

        // ✅ Hash/duplicate check ONLY for real submissions (not drafts)
        if (!isDraft) {
            s.setSubmissionHash(buildSubmissionHash(
                    org.getOrgId(),
                    e.getElectionId(),
                    req.getContestId(),
                    c.getCenterId(),
                    p.getPlaceId(),
                    agent.getUserId(),
                    s.getCandidateVotes(),
                    s.getBallotsCast(),
                    s.getInvalidBallots(),
                    s.getUnmarkedBallots(),
                    s.getRejectedBallots(),
                    s.getSpoiledBallots(),
                    s.getUnusedBallots()
            ));

            if (voteSubmissionRepository.existsBySubmissionHash(s.getSubmissionHash())) {
                throw new ResponseStatusException(CONFLICT, "Duplicate submission (same content).");
            }
        } else {
            // Draft should not be hashed/signed until submitted
            s.setSubmissionHash(null);
            s.setSubmissionSignature(null);
            s.setSubmissionSignerKeyId(null);
            s.setChainHash(null);
        }

        VoteSubmission saved = voteSubmissionRepository.save(s);

        if (files != null && !files.isEmpty()) {
            attachFilesToSubmission(org, saved, agent, files);
        }

        // ✅ Draft path ends here (no ledger/signing/received notification)
        if (isDraft) {
            auditLogService.logSubmissionCreate(
                    org.getOrgId(),
                    agent.getUserId(),
                    "VoteSubmission",
                    "Created DRAFT submission: " + saved.getSubmissionId() +
                            " contest=" + req.getContestId() +
                            " at " + c.getCenterName() +
                            " / place: " + p.getCode()
            );

            notify(
                    org.getOrgId(), agent.getUserId(),
                    NotificationType.VOTE,
                    "Draft Saved",
                    "Your draft for " + c.getCenterName() + " / place " + p.getCode() + " was saved.",
                    "vote_submission", saved.getSubmissionId(),
                    NotificationPriority.LOW,
                    DeliveryMethod.IN_APP
            );

            VoteSubmissionDto dto = mapper.toDTO(saved);
            enrichWithAllocation(dto, alloc);
            return dto;
        }

        // ---------------------------
        // 4) Non-draft: Ledger (atomic) + sign (existing behavior)
        // ---------------------------
        String payloadHash = buildSubmissionPayloadHash(saved);
        Map<String, Object> ledgerRes = jdbc.queryForMap(
                "SELECT * FROM fn_log_ledger_and_update_submission(?, ?, ?, ?)",
                "VOTE_SUBMISSION",
                saved.getSubmissionId(),
                payloadHash,
                agent.getUserId()
        );

        UUID ledgerId = toUuid(ledgerRes.get("ledger_id"));
        String chainHash = ledgerRes.get("chain_hash") != null ? ledgerRes.get("chain_hash").toString() : null;

        SigningService.SignResult signResult = signingService.signHex(chainHash);

        jdbc.update("UPDATE audit_ledger SET signature = ? WHERE ledger_id = ?", signResult.signature(), ledgerId);
        jdbc.update("UPDATE vote_submission SET submission_signature = ?, submission_signer_key_id = ? WHERE submission_id = ?",
                signResult.signature(), signResult.keyId(), saved.getSubmissionId());

        auditLogService.logSubmissionCreate(
                org.getOrgId(),
                agent.getUserId(),
                "VoteSubmission",
                "Created submission: " + saved.getSubmissionId() +
                        " contest=" + req.getContestId() +
                        " at " + c.getCenterName() +
                        " / place: " + p.getCode()
        );

        String placeDisplay = (p.getLabel() != null && !p.getLabel().isBlank())
                ? p.getLabel()
                : "Place " + p.getPlaceNumber();

        notify(
                org.getOrgId(), agent.getUserId(),
                NotificationType.VOTE,
                "Submission Received",
                "Your vote submission for " + c.getCenterName() + " - " + placeDisplay + " was received.",
                "vote_submission", saved.getSubmissionId(),
                NotificationPriority.NORMAL, DeliveryMethod.IN_APP
        );

        VoteSubmissionDto dto = mapper.toDTO(saved);
        enrichWithAllocation(dto, alloc);
        return dto;
    }


    // ------------------------------------------------------------------------
    // Update
    // ------------------------------------------------------------------------

    @Override
    @Transactional
    public VoteSubmissionDto update(UUID id, VoteSubmissionUpdateRequest req, List<MultipartFile> files) {
        int attempts = 0;

        while (true) {
            try {
                VoteSubmission s = voteSubmissionRepository.findById(id)
                        .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Submission not found"));

                // ✅ Allow updates for PENDING + DRAFT only
                if (s.getStatus() != VoteStatus.PENDING && s.getStatus() != VoteStatus.DRAFT) {
                    throw new ResponseStatusException(BAD_REQUEST, "Only PENDING or DRAFT submissions can be updated");
                }

                final boolean isDraft = (s.getStatus() == VoteStatus.DRAFT);

                PollingPlace place = s.getPollingPlace();
                if (place == null) {
                    throw new ResponseStatusException(BAD_REQUEST, "Submission is missing polling place reference");
                }

                var alloc = placeAllocationRepo
                        .findByElection_ElectionIdAndPollingPlace_PlaceId(
                                s.getElection().getElectionId(),
                                place.getPlaceId()
                        )
                        .orElseThrow(() -> new ResponseStatusException(
                                BAD_REQUEST,
                                "Polling place not allocated for this election"
                        ));

                Map<String, Integer> mergedVotes = mergeCandidateVotes(s.getCandidateVotes(), req.getCandidateVotes());

                if (mergedVotes.size() > MAX_CANDIDATE_KEYS) {
                    throw new ResponseStatusException(BAD_REQUEST, "Too many candidate entries");
                }

                boolean candidateVotesProvided = req.getCandidateVotes() != null;
                Integer castFromReq = req.getBallotsCast();

                // ✅ Only enforce ballotsCast when NOT draft
                if (!isDraft && candidateVotesProvided && castFromReq == null) {
                    throw new ResponseStatusException(
                            BAD_REQUEST,
                            "ballotsCast is required when updating candidateVotes"
                    );
                }

                // For draft: allow cast to remain 0 / existing
                int cast = (castFromReq != null) ? castFromReq : nzInt(s.getBallotsCast());
                int invalid = (req.getInvalidBallots() != null) ? req.getInvalidBallots() : nzInt(s.getInvalidBallots());
                int blank = (req.getUnmarkedBallots() != null) ? req.getUnmarkedBallots() : nzInt(s.getUnmarkedBallots());
                int rej = (req.getRejectedBallots() != null) ? req.getRejectedBallots() : nzInt(s.getRejectedBallots());
                int spo = (req.getSpoiledBallots() != null) ? req.getSpoiledBallots() : nzInt(s.getSpoiledBallots());
                int unused = (req.getUnusedBallots() != null) ? req.getUnusedBallots() : nzInt(s.getUnusedBallots());

                // ✅ Strict validations only for PENDING (not DRAFT)
                if (!isDraft) {
                    validateCandidateVotes(
                            s.getOrganization().getOrgId(),
                            s.getElection().getElectionId(),
                            s.getContestId(),
                            mergedVotes,
                            cast
                    );

                    validateTally(
                            mergedVotes, invalid, blank, rej, spo, unused, cast,
                            alloc.getRegisteredVoters(), alloc.getBallotsIssued()
                    );
                }

                // ---------------------------
                // Apply request after passing validations (or immediately for draft)
                // ---------------------------
                mapper.apply(req, s);

                // Ensure merged map is what gets saved (mapper may replace/ignore)
                s.setCandidateVotes(mergedVotes);

                // Optional: enforce ballotsCast if mapper doesn't set it correctly
                if (castFromReq != null) {
                    s.setBallotsCast(castFromReq);
                }

                // ✅ Ensure DB-required fields always set (draft-safe)
                if (s.getCandidateVotes() == null) s.setCandidateVotes(new HashMap<>());
                if (s.getBallotsCast() == null) s.setBallotsCast(0);

                // ✅ Draft updates do NOT produce hashes/signatures
                if (isDraft) {
                    s.setSubmissionHash(null);
                    s.setSubmissionSignature(null);
                    s.setSubmissionSignerKeyId(null);
                    s.setChainHash(null);
                } else {
                    // ✅ include contestId in hash (existing behavior)
                    s.setSubmissionHash(buildSubmissionHash(
                            s.getOrganization().getOrgId(),
                            s.getElection().getElectionId(),
                            s.getContestId(),
                            s.getPollingCenter().getCenterId(),
                            s.getPollingPlace().getPlaceId(),
                            s.getAgent().getUserId(),
                            s.getCandidateVotes(),
                            s.getBallotsCast(),
                            s.getInvalidBallots(),
                            s.getUnmarkedBallots(),
                            s.getRejectedBallots(),
                            s.getSpoiledBallots(),
                            s.getUnusedBallots()
                    ));
                }

                VoteSubmission saved = voteSubmissionRepository.save(s);

                if (files != null && !files.isEmpty()) {
                    attachFilesToSubmission(saved.getOrganization(), saved, saved.getAgent(), files);
                }

                // ✅ Draft: stop here (no ledger/signing/standard notify)
                if (isDraft) {
                    auditLogService.logSubmissionUpdate(
                            saved.getOrganization().getOrgId(),
                            saved.getAgent().getUserId(),
                            "VoteSubmission",
                            "Updated DRAFT submission: " + saved.getSubmissionId()
                    );

                    notify(
                            saved.getOrganization().getOrgId(), saved.getAgent().getUserId(),
                            NotificationType.VOTE,
                            "Draft Updated",
                            "Your draft submission for " + saved.getPollingCenter().getCenterName() + " was updated.",
                            "vote_submission", saved.getSubmissionId(),
                            NotificationPriority.LOW, DeliveryMethod.IN_APP
                    );

                    VoteSubmissionDto dto = mapper.toDTO(saved);
                    enrichWithAllocation(dto, alloc);
                    return dto;
                }

                // ---------------------------
                // Non-draft: Ledger update + sign (existing behavior)
                // ---------------------------
                String payloadHash = buildSubmissionPayloadHash(saved);
                Map<String, Object> ledgerRes = jdbc.queryForMap(
                        "SELECT * FROM fn_log_ledger_and_update_submission(?, ?, ?, ?)",
                        "VOTE_SUBMISSION_UPDATE",
                        saved.getSubmissionId(),
                        payloadHash,
                        saved.getAgent().getUserId()
                );

                UUID ledgerId = toUuid(ledgerRes.get("ledger_id"));
                String chainHash = ledgerRes.get("chain_hash") != null ? ledgerRes.get("chain_hash").toString() : null;

                SigningService.SignResult signResult = signingService.signHex(chainHash);

                jdbc.update("UPDATE audit_ledger SET signature = ? WHERE ledger_id = ?", signResult.signature(), ledgerId);
                jdbc.update(
                        "UPDATE vote_submission SET submission_signature = ?, submission_signer_key_id = ? WHERE submission_id = ?",
                        signResult.signature(), signResult.keyId(), saved.getSubmissionId()
                );

                auditLogService.logSubmissionUpdate(
                        saved.getOrganization().getOrgId(),
                        saved.getAgent().getUserId(),
                        "VoteSubmission",
                        "Updated submission: " + saved.getSubmissionId()
                );

                notify(
                        saved.getOrganization().getOrgId(), saved.getAgent().getUserId(),
                        NotificationType.VOTE,
                        "Submission Updated",
                        "Your vote submission for " + saved.getPollingCenter().getCenterName() + " was updated.",
                        "vote_submission", saved.getSubmissionId(),
                        NotificationPriority.LOW, DeliveryMethod.IN_APP
                );

                VoteSubmissionDto dto = mapper.toDTO(saved);
                enrichWithAllocation(dto, alloc);
                return dto;

            } catch (ObjectOptimisticLockingFailureException e) {
                attempts++;
                if (attempts > OPTIMISTIC_LOCK_RETRIES) {
                    throw new ResponseStatusException(CONFLICT, "Concurrent update conflict, please retry");
                }
                try { Thread.sleep(50L + (long) (Math.random() * 50)); } catch (InterruptedException ignored) {}
            }
        }
    }

    // ------------------------------------------------------------------------
    // Verify
    // ------------------------------------------------------------------------

    @Override
    @Transactional
    public VoteSubmissionDto verify(UUID id, VoteSubmissionVerifyRequest req) {

        VoteSubmission s = voteSubmissionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Submission not found"));

        if (s.getStatus() != VoteStatus.PENDING && s.getStatus() != VoteStatus.FLAGGED) {
            throw new ResponseStatusException(BAD_REQUEST, "Submission already processed");
        }

//        if (s.getStatus() != VoteStatus.PENDING) {
//            throw new ResponseStatusException(BAD_REQUEST, "Submission already processed");
//        }

        // ✅ contest-aware validation before verifying
        validateCandidateVotes(
                s.getOrganization().getOrgId(),
                s.getElection().getElectionId(),
                s.getContestId(),
                s.getCandidateVotes(),
                s.getBallotsCast()
        );

        SystemUser verifier = userRepo.findById(req.getVerifierUserId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Verifier not found"));

        boolean accept = Boolean.TRUE.equals(req.getAccept());
        s.setStatus(accept ? VoteStatus.VERIFIED : VoteStatus.REJECTED);
        s.setVerifiedBy(verifier);
        s.setDateVerified(LocalDateTime.now());

        if (req.getComment() != null && !req.getComment().isBlank()) {
            String prefix = accept ? "[review] " : "[rejected] ";
            s.setComments(prefix + req.getComment());
        } else {
            s.setComments(null);
        }

        VoteSubmission saved = voteSubmissionRepository.save(s);

        // publish recompute AFTER commit
        final RecomputeEvent recomputeEvent = new RecomputeEvent(
                this,
                saved.getOrganization().getOrgId(),
                saved.getElection().getElectionId(),
                verifier.getUserId()
        );

        try {
            if (org.springframework.transaction.support.TransactionSynchronizationManager.isSynchronizationActive()) {
                org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                        new org.springframework.transaction.support.TransactionSynchronization() {
                            @Override
                            public void afterCommit() {
                                try {
                                    eventPublisher.publishEvent(recomputeEvent);
                                } catch (Exception ex) {
                                    log.warn("Failed to publish RecomputeEvent after commit: {}", ex.getMessage());
                                }
                            }
                        }
                );
            } else {
                eventPublisher.publishEvent(recomputeEvent);
            }
        } catch (Exception ex) {
            log.warn("Could not schedule recompute event: {}", ex.getMessage());
        }

        if (saved.getStatus() == VoteStatus.VERIFIED) {
            notify(
                    saved.getOrganization().getOrgId(), saved.getAgent().getUserId(),
                    NotificationType.VOTE,
                    "Submission Verified",
                    "Your submission at " + saved.getPollingCenter().getCenterName() + " was verified.",
                    "vote_submission", saved.getSubmissionId(),
                    NotificationPriority.NORMAL, DeliveryMethod.IN_APP
            );

            auditLogService.logSubmissionVerify(
                    saved.getOrganization().getOrgId(),
                    verifier.getUserId(),
                    "VoteSubmission",
                    "Verified submission: " + saved.getSubmissionId()
            );
        } else {
            String message = "Your submission at " + saved.getPollingCenter().getCenterName() + " was rejected.";
            if (req.getComment() != null && !req.getComment().isBlank()) {
                message += " Reason: " + req.getComment();
            }

            notify(
                    saved.getOrganization().getOrgId(), saved.getAgent().getUserId(),
                    NotificationType.VOTE,
                    "Submission Rejected",
                    message,
                    "vote_submission", saved.getSubmissionId(),
                    NotificationPriority.NORMAL, DeliveryMethod.IN_APP
            );

            auditLogService.logSubmissionReject(
                    saved.getOrganization().getOrgId(),
                    verifier.getUserId(),
                    "VoteSubmission",
                    "Rejected submission: " + saved.getSubmissionId() +
                            (req.getComment() != null && !req.getComment().isBlank()
                                    ? " Reason: " + req.getComment()
                                    : "")
            );
        }

        return mapper.toDTO(saved);
    }


    @Override
    @Transactional
    public VoteSubmissionDto submitDraft(UUID id, HttpServletRequest request) {

        VoteSubmission s = voteSubmissionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Submission not found"));

        if (s.getStatus() != VoteStatus.DRAFT) {
            throw new ResponseStatusException(BAD_REQUEST, "Only DRAFT submissions can be submitted");
        }

        PollingPlace place = s.getPollingPlace();
        var alloc = placeAllocationRepo
                .findByElection_ElectionIdAndPollingPlace_PlaceId(
                        s.getElection().getElectionId(),
                        place.getPlaceId()
                )
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Polling place not allocated for this election"));

        // Require minimum “final submission” requirements
        if (s.getBallotsCast() == null || s.getBallotsCast() <= 0) {
            throw new ResponseStatusException(BAD_REQUEST, "ballotsCast is required to submit draft");
        }
        if (s.getCandidateVotes() == null) s.setCandidateVotes(new HashMap<>());

        // Full validations
        validateCandidateVotes(
                s.getOrganization().getOrgId(),
                s.getElection().getElectionId(),
                s.getContestId(),
                s.getCandidateVotes(),
                s.getBallotsCast()
        );

        validateTally(
                s.getCandidateVotes(),
                nz(s.getInvalidBallots()),
                nz(s.getUnmarkedBallots()),
                nz(s.getRejectedBallots()),
                nz(s.getSpoiledBallots()),
                nz(s.getUnusedBallots()),
                nz(s.getBallotsCast()),
                alloc.getRegisteredVoters(),
                alloc.getBallotsIssued()
        );

        // Set official fields
        s.setStatus(VoteStatus.PENDING);
        s.setSubmissionTime(LocalDateTime.now());

        if (request != null) {
            s.setClientIp(RequestUtils.getClientIp(request));
            s.setUserAgent(RequestUtils.getUserAgent(request));
        }

        // Hash + duplicate check
        s.setSubmissionHash(buildSubmissionPayloadHash(s));
        if (voteSubmissionRepository.existsBySubmissionHash(s.getSubmissionHash())) {
            throw new ResponseStatusException(CONFLICT, "Duplicate submission (same content).");
        }

        VoteSubmission saved = voteSubmissionRepository.save(s);

        // Ledger + sign (same as your create/update)
        String payloadHash = buildSubmissionPayloadHash(saved);
        Map<String, Object> ledgerRes = jdbc.queryForMap(
                "SELECT * FROM fn_log_ledger_and_update_submission(?, ?, ?, ?)",
                "VOTE_SUBMISSION_SUBMIT_DRAFT",
                saved.getSubmissionId(),
                payloadHash,
                saved.getAgent().getUserId()
        );

        UUID ledgerId = toUuid(ledgerRes.get("ledger_id"));
        String chainHash = ledgerRes.get("chain_hash") != null ? ledgerRes.get("chain_hash").toString() : null;

        SigningService.SignResult signResult = signingService.signHex(chainHash);

        jdbc.update("UPDATE audit_ledger SET signature = ? WHERE ledger_id = ?", signResult.signature(), ledgerId);
        jdbc.update("UPDATE vote_submission SET submission_signature = ?, submission_signer_key_id = ? WHERE submission_id = ?",
                signResult.signature(), signResult.keyId(), saved.getSubmissionId());

        notify(
                saved.getOrganization().getOrgId(), saved.getAgent().getUserId(),
                NotificationType.VOTE,
                "Draft Submitted",
                "Your draft submission for " + saved.getPollingCenter().getCenterName() + " was submitted for review.",
                "vote_submission", saved.getSubmissionId(),
                NotificationPriority.NORMAL, DeliveryMethod.IN_APP
        );

        VoteSubmissionDto dto = mapper.toDTO(saved);
        enrichWithAllocation(dto, alloc);
        return dto;
    }

    @Override
    @Transactional
    public VoteSubmissionDto flag(UUID id, VoteSubmissionFlagRequest req) {

        VoteSubmission s = voteSubmissionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Submission not found"));

        if (req == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Request body is required");
        }
        if (req.getActorUserId() == null) {
            throw new ResponseStatusException(BAD_REQUEST, "actorUserId is required");
        }
        if (req.getFlagged() == null) {
            throw new ResponseStatusException(BAD_REQUEST, "flagged is required");
        }

        SystemUser actor = userRepo.findById(req.getActorUserId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Actor not found"));

        boolean flagged = Boolean.TRUE.equals(req.getFlagged());
        String comment = req.getComments() == null ? null : req.getComments().trim();

        if (flagged) {
            VoteStatus st = s.getStatus();
            if (st != VoteStatus.PENDING && st != VoteStatus.DRAFT) {
                throw new ResponseStatusException(BAD_REQUEST, "Only DRAFT or PENDING submissions can be flagged");
            }
            if (comment == null || comment.isBlank()) {
                throw new ResponseStatusException(BAD_REQUEST, "Comments is required when flagging a submission");
            }

            s.setStatus(VoteStatus.FLAGGED);
            s.setFlaggedBy(actor);
            s.setDateFlagged(LocalDateTime.now());
            s.setComments("[flagged] " + comment);

            auditLogService.log(
                    s.getOrganization().getOrgId(),
                    actor.getUserId(),
                    ActivityType.VOTE_FLAGGED,
                    "vote_submission",
                    "Flagged submission: " + s.getSubmissionId() + " comments=" + comment
            );
        } else {
            if (s.getStatus() != VoteStatus.FLAGGED) {
                throw new ResponseStatusException(BAD_REQUEST, "Only FLAGGED submissions can be unflagged");
            }

            s.setStatus(VoteStatus.PENDING);
            s.setFlaggedBy(null);
            s.setDateFlagged(null);

            if (comment != null && !comment.isBlank()) s.setComments("[unflagged] " + comment);

            auditLogService.log(
                    s.getOrganization().getOrgId(),
                    actor.getUserId(),
                    ActivityType.VOTE_UNFLAGGED,
                    "vote_submission",
                    "Unflagged submission: " + s.getSubmissionId() + (comment != null ? " comments=" + comment : "")
            );
        }

        return mapper.toDTO(voteSubmissionRepository.save(s));
    }


    // ------------------------------------------------------------------------
    // Delete / Get / Search (search updated to allow contestId)
    // ------------------------------------------------------------------------

    @Override
    @Transactional
    public void delete(UUID id) {
        VoteSubmission s = voteSubmissionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Submission not found"));

        voteSubmissionRepository.deleteById(id);

        notify(
                s.getOrganization().getOrgId(), s.getAgent().getUserId(),
                NotificationType.VOTE,
                "Submission Deleted",
                "Your vote submission for " + s.getPollingCenter().getCenterName() + " was deleted.",
                "vote_submission", s.getSubmissionId(),
                NotificationPriority.LOW, DeliveryMethod.IN_APP
        );
    }


    // -------------------------
// GET: enrich with allocation (place allocation)
// -------------------------
    @Override
    @Transactional(readOnly = true)
    public VoteSubmissionDto get(UUID id) {
        VoteSubmission s = voteSubmissionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Submission not found"));

        VoteSubmissionDto dto = mapper.toDTO(s);

        PollingPlace place = s.getPollingPlace();
        if (place != null) {
            placeAllocationRepo
                    .findByElection_ElectionIdAndPollingPlace_PlaceId(
                            s.getElection().getElectionId(),
                            place.getPlaceId()
                    )
                    .ifPresent(alloc -> enrichWithAllocation(dto, alloc));
        } else {
            dto.setAllocationSource("NONE");
        }

        return dto;
    }


    @Override
    @Transactional(readOnly = true)
    public Page<VoteSubmissionDto> search(
            UUID orgId,
            UUID electionId,
            UUID centerId,
            UUID agentId,
            VoteStatus status,
            LocalDateTime from,
            LocalDateTime to,
            String q,
            ContestCategory category,
            ContestScopeType scopeType,
            UUID countyId,
            UUID districtId,
            UUID contestId,          // ✅ contest dropdown filter
            Pageable pageable
    ) {
        // ✅ used for agent-only draft visibility
        UUID currentUserId = resolveCurrentUserId();

        Specification<VoteSubmission> spec = Specification
                .where(VoteSubmissionSpecs.orgEquals(orgId))
                .and(VoteSubmissionSpecs.electionEquals(electionId))
                .and(VoteSubmissionSpecs.centerEquals(centerId))
                .and(VoteSubmissionSpecs.agentEquals(agentId))

                // ✅ DRAFT rules:
                // - status=null => exclude drafts unless owned by current user
                // - status=DRAFT => only owned drafts
                .and(VoteSubmissionSpecs.statusEquals(status, currentUserId))

                .and(VoteSubmissionSpecs.between(from, to))
                .and(VoteSubmissionSpecs.textSearch(q))
                .and(VoteSubmissionSpecs.contestCategoryEquals(category))
                .and(VoteSubmissionSpecs.contestScopeEquals(scopeType))

                // ✅ contest dropdown should filter by submission's contest
                .and(VoteSubmissionSpecs.contestEquals(contestId))

                // ✅ FIX: filter by submission location (center->district->county)
                .and(VoteSubmissionSpecs.countyEquals(countyId))
                .and(VoteSubmissionSpecs.districtEquals(districtId))

                // ✅ UX: FLAGGED first, then PENDING, VERIFIED, REJECTED, DRAFT
                // (does nothing for count query)
                .and(VoteSubmissionSpecs.orderByStatusPriorityThenDateDesc());

        Page<VoteSubmission> page = voteSubmissionRepository.findAll(spec, pageable);

        // ✅ keep allocation mapping as-is
        List<UUID> placeIds = page.getContent().stream()
                .map(s -> s.getPollingPlace() == null ? null : s.getPollingPlace().getPlaceId())
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        Map<UUID, PollingPlaceAllocation> allocByPlaceId = placeIds.isEmpty()
                ? Map.of()
                : placeAllocationRepo
                .findByElection_ElectionIdAndPollingPlace_PlaceIdIn(electionId, placeIds)
                .stream()
                .filter(a -> a.getPollingPlace() != null && a.getPollingPlace().getPlaceId() != null)
                .collect(Collectors.toMap(
                        a -> a.getPollingPlace().getPlaceId(),
                        a -> a,
                        (a, b) -> a
                ));

        return page.map(s -> {
            VoteSubmissionDto dto = mapper.toDTO(s);

            PollingPlaceAllocation alloc = (s.getPollingPlace() == null)
                    ? null
                    : allocByPlaceId.get(s.getPollingPlace().getPlaceId());

            if (alloc != null) {
                dto.setRegisteredVoters(alloc.getRegisteredVoters());
                dto.setBallotsIssued(alloc.getBallotsIssued());
                dto.setAllocationSource("PLACE");
            } else {
                dto.setAllocationSource("NONE");
            }

            return dto;
        });
    }



    @Override
    @Transactional(readOnly = true)
    public long countVisibleSubmissions() {
        Object x = em.createNativeQuery("SELECT COUNT(*) FROM public.vote_submission").getSingleResult();
        return ((Number) x).longValue();
    }

    // ------------------------------------------------------------------------
    // Notifications
    // ------------------------------------------------------------------------

    private void notify(UUID orgId, UUID userId,
                        NotificationType type, String title, String message,
                        String relatedTable, UUID relatedId,
                        NotificationPriority priority, DeliveryMethod method) {

        Set<DeliveryMethod> channels = EnumSet.of(method);
        NotificationCreateRequest r = NotificationCreateRequest.builder()
                .orgId(orgId)
                .userId(userId)
                .type(type)
                .title(title)
                .message(message)
                .relatedTable(relatedTable)
                .relatedId(relatedId)
                .priority(priority != null ? priority : NotificationPriority.NORMAL)
                .channels(channels)
                .build();

        notificationService.publish(r);
    }

    // ------------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------------

    private static void validateTally(Map<String, Integer> votes,
                                      int invalid,
                                      int unmarked,
                                      int rejected,
                                      int spoiled,
                                      int unused,
                                      int cast,
                                      int registered,
                                      Integer ballotsIssued) {
        long sumVotes = votes == null ? 0L : votes.values().stream().mapToLong(Integer::longValue).sum();
        validateTallyInternal(sumVotes, invalid, unmarked, rejected, spoiled, unused, cast, registered, ballotsIssued);
    }


    private static void validateTallyInternal(long sumVotes,
                                              int invalid,
                                              int unmarked,
                                              int rejected,
                                              int spoiled,
                                              int unused,
                                              int cast,
                                              int registered,
                                              Integer ballotsIssued) {

        if (cast < 0 || registered < 0) throw new ResponseStatusException(BAD_REQUEST, "Negative counts not allowed");
        if (invalid < 0 || unmarked < 0 || rejected < 0 || spoiled < 0 || unused < 0)
            throw new ResponseStatusException(BAD_REQUEST, "Negative category counts not allowed");

        // ✅ Cast-side accountability (all of these are ballots in the box / part of cast)
        long castAccounted = sumVotes + invalid + unmarked + rejected + spoiled;
        if (castAccounted > cast)
            throw new ResponseStatusException(BAD_REQUEST, "Cast breakdown exceeds ballotsCast");

        // ✅ Issued-side accountability (inventory)
        if (ballotsIssued != null) {
            long issuedAccounted = (long) cast + unused;
            if (issuedAccounted > ballotsIssued)
                throw new ResponseStatusException(BAD_REQUEST, "ballotsCast + unusedBallots exceeds ballotsIssued");

            // Optional strict rule (enable if your ops require exact reconciliation)
            if (issuedAccounted != ballotsIssued)
                throw new ResponseStatusException(BAD_REQUEST, "ballotsCast + unusedBallots must equal ballotsIssued");

        }

        if (cast > registered)
            throw new ResponseStatusException(BAD_REQUEST, "ballotsCast exceeds totalRegisteredVoters");
    }


    private static String buildSubmissionHash(UUID orgId,
                                              UUID electionId,
                                              UUID contestId,
                                              UUID centerId,
                                              UUID placeId,
                                              UUID agentId,
                                              Map<String, Integer> votesMap,
                                              int cast,
                                              int invalid,
                                              int unmarked,
                                              int rejected,
                                              int spoiled,
                                              int unused) {

        String votesJson;
        try {
            Map<String, Integer> sorted = new TreeMap<>();
            if (votesMap != null) votesMap.forEach(sorted::put);
            votesJson = JSON.writeValueAsString(sorted);
        } catch (Exception ex) {
            votesJson = "{}";
        }

        String payload =
                orgId + "|" +
                        electionId + "|" +
                        contestId + "|" +
                        centerId + "|" +
                        placeId + "|" +
                        agentId + "|" +
                        votesJson + "|" +
                        cast + "|" +
                        invalid + "|" +
                        unmarked + "|" +
                        rejected + "|" +
                        spoiled + "|" +
                        unused;

        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }

    private static String buildSubmissionPayloadHash(VoteSubmission s) {
        return buildSubmissionHash(
                s.getOrganization().getOrgId(),
                s.getElection().getElectionId(),
                s.getContestId(),
                s.getPollingCenter().getCenterId(),
                s.getPollingPlace().getPlaceId(),
                s.getAgent().getUserId(),
                s.getCandidateVotes(),
                s.getBallotsCast(),
                s.getInvalidBallots(),
                s.getUnmarkedBallots(),
                s.getRejectedBallots(),
                s.getSpoiledBallots(),
                nz(s.getUnusedBallots())
        );
    }

    private UUID toUuid(Object o) {
        if (o == null) return null;
        if (o instanceof UUID) return (UUID) o;
        if (o instanceof String) return UUID.fromString((String) o);
        return UUID.fromString(o.toString());
    }

    private static int nz(Integer x) { return x == null ? 0 : x; }

    private void attachFilesToSubmission(Organization org, VoteSubmission submission, SystemUser uploadedBy, List<MultipartFile> files) {
        if (files == null || files.isEmpty()) return;

        List<FileUploadDto> stored = fileUploadService.saveAllForEntity(
                org, "vote_submission", submission.getSubmissionId(), uploadedBy, files, Map.of("source", "agent_upload")
        );

        for (FileUploadDto f : stored) {
            String mime = f.getMimeType();
            if (mime != null && mime.startsWith("image/")) {
                if (f.getSha256() != null && tallySheetRepository.existsBySubmissionAndSha(submission.getSubmissionId(), f.getSha256())) {
                    continue;
                }
                TallySheet t = new TallySheet();
                t.setOrganization(org);
                t.setSubmission(submission);
                t.setImageUrl(f.getFileUrl());
                t.setFileSha256(f.getSha256());
                tallySheetRepository.save(t);
            }

            auditLogService.logTallyUpload(
                    org.getOrgId(),
                    uploadedBy.getUserId(),
                    "TallySheet",
                    "Uploaded tally sheet for submission: " + submission.getSubmissionId()
            );
        }
    }

    /**
     * ✅ Contest-aware validation:
     * - Candidate votes must belong to this contest via contest_option.
     * - Values must be non-negative.
     * - Sum(votes) <= ballotsCast
     */
    private void validateCandidateVotes(UUID orgId,
                                        UUID electionId,
                                        UUID contestId,
                                        Map<String, Integer> candidateVotes,
                                        Integer ballotsCast) {

        // allow empty submissions (blank/invalid ballots only)
        if (candidateVotes == null || candidateVotes.isEmpty()) return;

        if (candidateVotes.size() > MAX_CANDIDATE_KEYS) {
            throw new ResponseStatusException(BAD_REQUEST, "Too many candidate entries");
        }

        // contest must exist and belong to election
        Contest contest = contestRepo.findById(contestId)
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Invalid contestId"));
        if (!contest.getElectionId().equals(electionId)) {
            throw new ResponseStatusException(BAD_REQUEST, "Contest does not belong to election");
        }
        if (!contest.isActive()) {
            throw new ResponseStatusException(BAD_REQUEST, "Contest is not active");
        }

        // validate key/value shape + parse candidate UUIDs
        List<UUID> candidateIds = new ArrayList<>(candidateVotes.size());
        for (Map.Entry<String, Integer> e : candidateVotes.entrySet()) {

            String cid = e.getKey();
            Integer v = e.getValue();

            if (cid == null || cid.isBlank()) {
                throw new ResponseStatusException(BAD_REQUEST, "candidateVotes contains null/blank candidate id");
            }
            if (v == null || v < 0) {
                throw new ResponseStatusException(BAD_REQUEST, "candidateVotes for candidate " + cid + " must be >= 0");
            }

            try {
                candidateIds.add(UUID.fromString(cid));
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(BAD_REQUEST, "candidateVotes contains invalid UUID: " + cid);
            }
        }

        // allowed candidates from contest_option
        // allowed candidates from contest_option (CANDIDATE options only)
        Set<UUID> allowedCandidateIds = contestOptionRepo.findActiveCandidateElectIdsByContestId(contestId);
        if (allowedCandidateIds == null || allowedCandidateIds.isEmpty()) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Contest has no active candidate options configured"
            );
        }

        List<UUID> invalidCandidates = candidateIds.stream()
                .filter(id -> !allowedCandidateIds.contains(id))
                .distinct()
                .toList();

        if (!invalidCandidates.isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Candidates not allowed for this contest: " + invalidCandidates);
        }

        // sanity sum <= ballotsCast
        if (ballotsCast != null) {
            long totalVotes = candidateVotes.values().stream().mapToLong(Integer::longValue).sum();
            if (totalVotes > ballotsCast) {
                throw new ResponseStatusException(
                        BAD_REQUEST,
                        "Sum of candidate votes (" + totalVotes + ") exceeds ballotsCast (" + ballotsCast + ")"
                );
            }
        }
    }



    /* ADD this helper record near top (optional but clean) */
    private record AllocationView(Integer registeredVoters, Integer ballotsIssued, String source) {}

    /* ADD this helper method inside service class */
    private void enrichWithAllocation(VoteSubmissionDto dto, PollingPlaceAllocation alloc) {
        if (dto == null || alloc == null) return;

        dto.setRegisteredVoters(alloc.getRegisteredVoters());
        dto.setBallotsIssued(alloc.getBallotsIssued());
        dto.setAllocationSource("PLACE");

        // turnoutPct = cast / registered * 100
        if (dto.getBallotsCast() != null && alloc.getRegisteredVoters() > 0) {
            dto.setTurnoutPct((dto.getBallotsCast() * 100.0) / alloc.getRegisteredVoters());
        } else {
            dto.setTurnoutPct(null);
        }

        // invalidPct = invalidTotal / cast * 100
        if (dto.getBallotsCast() != null && dto.getBallotsCast() > 0 && dto.getInvalidTotal() != null) {
            dto.setInvalidPct((dto.getInvalidTotal() * 100.0) / dto.getBallotsCast());
        } else {
            dto.setInvalidPct(null);
        }
    }



    private int nzInt(Integer v) {
        return v == null ? 0 : v;
    }

    /**
     * Merge votes safely:
     * - If updates == null => keep existing map
     * - If updates contains a key => overwrite that key
     * - Supports “update only one candidate” without losing other candidates
     */
    private Map<String, Integer> mergeCandidateVotes(Map<String, Integer> existing,
                                                     Map<String, Integer> updates) {

        Map<String, Integer> out = new HashMap<>();
        if (existing != null) out.putAll(existing);

        if (updates == null) return out;

        for (Map.Entry<String, Integer> e : updates.entrySet()) {
            String k = e.getKey();
            Integer v = e.getValue();

            if (k == null || k.isBlank()) {
                throw new ResponseStatusException(BAD_REQUEST, "candidateVotes contains null/blank candidate id");
            }
            if (v == null || v < 0) {
                throw new ResponseStatusException(BAD_REQUEST, "candidateVotes for candidate " + k + " must be >= 0");
            }

            out.put(k, v);
        }

        return out;
    }


    private UUID resolveCurrentUserId() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null) return null;

            Object principal = auth.getPrincipal();

            // If your principal is Jwt
            if (principal instanceof Jwt jwt) {
                // Use whichever claim you store userId in.
                // Common: "sub" or "userId"
                String v = jwt.getClaimAsString("userId");
                if (v == null || v.isBlank()) v = jwt.getSubject();
                return (v == null || v.isBlank()) ? null : UUID.fromString(v);
            }

            // If you store UUID directly
            if (principal instanceof String s) {
                return UUID.fromString(s);
            }

            return null;
        } catch (Exception ex) {
            return null;
        }
    }


    /**
     * Persist chain hash signature and update submission record.
     */
    private void signAndPersistChainHash(String chainHash, VoteSubmission submission, UUID orgId, UUID actorUserId) {
        SigningService.SignResult signResult;
        try {
            signResult = signingService.signHex(chainHash);
        } catch (Exception ex) {
            log.error("Failed to sign chain hash for submission {}: {}", submission.getSubmissionId(), ex.getMessage(), ex);
            try {
                auditLogService.log(orgId, actorUserId, Backend.ElectionVote.enums.ActivityType.SYSTEM_ERROR, "vote_submission", "Signing failed for submission " + submission.getSubmissionId() + ": " + ex.getMessage());
            } catch (Exception auditEx) {
                log.warn("Audit logging failed after signing error for submission {}: {}", submission.getSubmissionId(), auditEx.getMessage(), auditEx);
            }
            throw new ResponseStatusException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, "Failed to sign submission");
        }

        submission.setSubmissionSignature(signResult.signature());

        try {
            submission.setSubmissionSignerKeyId((java.util.UUID) signResult.keyId());
        } catch (ClassCastException cce) {
            Object keyIdObj = signResult.keyId();
            if (keyIdObj != null) {
                String keyIdStr = String.valueOf(keyIdObj);
                try {
                    java.util.UUID keyUuid = java.util.UUID.fromString(keyIdStr);
                    submission.setSubmissionSignerKeyId(keyUuid);
                } catch (IllegalArgumentException iae) {
                    log.warn("Signing service returned non-UUID keyId for submission {}: {}", submission.getSubmissionId(), keyIdStr);
                    submission.setSubmissionSignerKeyId(null);
                }
            } else {
                submission.setSubmissionSignerKeyId(null);
            }
        }

        voteSubmissionRepository.save(submission);
    }



}
