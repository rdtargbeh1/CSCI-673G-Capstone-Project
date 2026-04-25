package election.ems_backend.service.implement;

import election.ems_backend.dto.*;
import election.ems_backend.entity.*;
import election.ems_backend.enums.*;
import election.ems_backend.exception.InvalidStateException;
import election.ems_backend.mapper.DiscrepancyMapper;
import election.ems_backend.repository.*;
import election.ems_backend.service.DiscrepancyService;
import election.ems_backend.service.NotificationService;
import election.ems_backend.utility.DiscrepancySpecs;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.BAD_REQUEST;


@Service
@RequiredArgsConstructor
@Transactional
public class DiscrepancyServiceImplementation implements DiscrepancyService {

    private final DiscrepancyRepository discrepancyRepository;
    private final VoteSubmissionRepository submissionRepository;
    private final ElectionRepository electionRepository;
    private final PollingCenterRepository centerRepository;
    private final PollingPlaceRepository placeRepository;
    private final OrganizationRepository organizationRepository;
    private final DiscrepancyMapper mapper;
    private final NotificationService notificationService;


    private static final Logger log = LoggerFactory.getLogger(DiscrepancyService.class);


    // ===== DETECTION & CREATION =====

    /**
     * Create discrepancy for OPENING phase
     * Check: ballots_issued == ballots_received
     */
    @Override
    @Transactional
    public Discrepancy createOpeningPhaseDiscrepancy(VoteSubmission submission, Integer ballotsIssued,
            DiscrepancySeverity severity) {

        int expected = ballotsIssued;
        int actual = submission.getBallotsReceived();
        int delta = actual - expected;

        if (delta == 0) {
            return null; // No discrepancy
        }

        Discrepancy disc = Discrepancy.builder()
                .voteSubmission(submission)
                .election(submission.getElection())
                .pollingPlace(submission.getPollingPlace())
                .pollingCenter(submission.getPollingCenter())
                .organization(submission.getOrganization())
                .contestId(submission.getContestId())
                .discrepancyType(DiscrepancyType.BALLOT_STOCK_MISMATCH)
                .reconciliationPhase(DiscrepancyReconciliationPhase.OPENING)
                .severity(severity)
                .fieldName("ballots_received")
                .expectedValue(String.valueOf(expected))
                .actualValue(String.valueOf(actual))
                .delta(delta)
                .description(String.format(
                        "Ballot stock mismatch: manifest issued %d, agent received %d (delta: %d)",
                        expected, actual, delta))
                .status(DiscrepancyStatus.OPEN)
                .createdAt(LocalDateTime.now())
                .build();

        return discrepancyRepository.save(disc);
    }

    /**
     * Create discrepancy for CLOSING phase - Ballot Reconciliation
     * Check: ballotsIssued == ballotsInBox + unusedBallots + spoiledBallots
     */
    @Override
    @Transactional
    public Discrepancy createBallotReconciliationDiscrepancy(
            VoteSubmission submission,
            Integer ballotsIssued,
            DiscrepancySeverity severity) {

        // ✅ Get ballots outside box
        int unused = submission.getUnusedBallots() != null ? submission.getUnusedBallots() : 0;
        int spoiled = submission.getSpoiledBallots() != null ? submission.getSpoiledBallots() : 0;

        // ✅ Get ballots inside box
        int ballotsInBox = submission.getBallotsInBox() != null ? submission.getBallotsInBox() : 0;

        // ✅ Calculate expected: ballotsInBox + unused + spoiled
        long expected = (long) ballotsInBox + unused + spoiled;
        long actual = ballotsIssued != null ? ballotsIssued : 0;
        long delta = actual - expected;

        // ✅ No discrepancy if reconciliation is perfect
        if (delta == 0) {
            return null;
        }

        Discrepancy disc = Discrepancy.builder()
                .voteSubmission(submission)
                .election(submission.getElection())
                .pollingPlace(submission.getPollingPlace())
                .pollingCenter(submission.getPollingCenter())
                .organization(submission.getOrganization())
                .contestId(submission.getContestId())
                .discrepancyType(DiscrepancyType.BALLOT_RECONCILIATION_MISMATCH)
                .reconciliationPhase(DiscrepancyReconciliationPhase.CLOSING)
                .severity(severity)
                .fieldName("ballot_reconciliation")
                .expectedValue(String.valueOf(expected))
                .actualValue(String.valueOf(actual))
                .delta((int) delta)
                .description(String.format(
                        "Ballot reconciliation mismatch: issued=%d, expected (inBox=%d + unused=%d + spoiled=%d) = %d, delta=%d",
                        actual, ballotsInBox, unused, spoiled, expected, delta))
                .details(Map.of(
                        "ballotsInBox", ballotsInBox,
                        "unused", unused,
                        "spoiled", spoiled,
                        "ballotsIssued", actual,
                        "expected", expected,
                        "delta", delta
                ))
                .status(DiscrepancyStatus.OPEN)
                .createdAt(LocalDateTime.now())
                .build();

        return discrepancyRepository.save(disc);
    }



    /**
     * Create discrepancy for CLOSING phase - Vote Tally Reconciliation
     * Check: ballotsInBox == sum(candidateVotes) + invalidBallots + unmarkedBallots + rejectedBallots
     */
    @Override
    @Transactional
    public Discrepancy createVoteTallyDiscrepancy(
            VoteSubmission submission,
            DiscrepancySeverity severity) {

        // ✅ Calculate sum of candidate votes (valid votes)
        long sumVotes = submission.getCandidateVotes() != null ?
                submission.getCandidateVotes().values().stream()
                        .mapToLong(v -> v == null ? 0L : v.longValue()).sum() : 0L;

        // ✅ Get all invalid ballot counts (inside box)
        int invalid = submission.getInvalidBallots() != null ? submission.getInvalidBallots() : 0;
        int unmarked = submission.getUnmarkedBallots() != null ? submission.getUnmarkedBallots() : 0;
        int rejected = submission.getRejectedBallots() != null ? submission.getRejectedBallots() : 0;

        // ✅ Calculate expected: sum(votes) + invalid + unmarked + rejected
        long expected = sumVotes + invalid + unmarked + rejected;

        // ✅ Get actual ballots in box
        long actual = submission.getBallotsInBox() != null ? submission.getBallotsInBox() : 0;
        long delta = actual - expected;

        // ✅ No discrepancy if tally is perfect
        if (delta == 0) {
            return null;
        }

        Discrepancy disc = Discrepancy.builder()
                .voteSubmission(submission)
                .election(submission.getElection())
                .pollingPlace(submission.getPollingPlace())
                .pollingCenter(submission.getPollingCenter())
                .organization(submission.getOrganization())
                .contestId(submission.getContestId())
                .discrepancyType(DiscrepancyType.VOTE_TALLY_MISMATCH)
                .reconciliationPhase(DiscrepancyReconciliationPhase.CLOSING)
                .severity(severity)
                .fieldName("vote_tally")
                .expectedValue(String.valueOf(expected))
                .actualValue(String.valueOf(actual))
                .delta((int) delta)
                .description(String.format(
                        "Vote tally mismatch: ballotsInBox=%d, expected (votes=%d + invalid=%d + unmarked=%d + rejected=%d) = %d, delta=%d",
                        actual, sumVotes, invalid, unmarked, rejected, expected, delta))
                .details(Map.of(
                        "candidateVotesSum", sumVotes,
                        "invalidBallots", invalid,
                        "unmarkedBallots", unmarked,
                        "rejectedBallots", rejected,
                        "ballotsInBox", actual,
                        "expected", expected,
                        "delta", delta
                ))
                .status(DiscrepancyStatus.OPEN)
                .createdAt(LocalDateTime.now())
                .build();

        return discrepancyRepository.save(disc);
    }



    /**
     * Create discrepancy for CLOSING phase - Ballots in Box
     * Check: ballotsReceived == ballotsInBox + unused + spoiled
     * OR: ballotsInBox == ballotsReceived - unused - spoiled
     */
    @Override
    @Transactional
    public Discrepancy createBallotsInBoxDiscrepancy(
            VoteSubmission submission,
            DiscrepancySeverity severity) {

        // ✅ Get ballots received
        int received = submission.getBallotsReceived() != null ? submission.getBallotsReceived() : 0;

        // ✅ Get ballots outside box
        int unused = submission.getUnusedBallots() != null ? submission.getUnusedBallots() : 0;
        int spoiled = submission.getSpoiledBallots() != null ? submission.getSpoiledBallots() : 0;

        // ✅ Calculate expected: received - unused - spoiled
        int expected = received - unused - spoiled;

        // ✅ Get actual ballots in box
        int actual = submission.getBallotsInBox() != null ? submission.getBallotsInBox() : 0;
        int delta = actual - expected;

        // ✅ No discrepancy if calculation is perfect
        if (delta == 0) {
            return null;
        }

        Discrepancy disc = Discrepancy.builder()
                .voteSubmission(submission)
                .election(submission.getElection())
                .pollingPlace(submission.getPollingPlace())
                .pollingCenter(submission.getPollingCenter())
                .organization(submission.getOrganization())
                .contestId(submission.getContestId())
                .discrepancyType(DiscrepancyType.BALLOTS_IN_BOX_MISMATCH)
                .reconciliationPhase(DiscrepancyReconciliationPhase.CLOSING)
                .severity(severity)
                .fieldName("ballots_in_box")
                .expectedValue(String.valueOf(expected))
                .actualValue(String.valueOf(actual))
                .delta(delta)
                .description(String.format(
                        "Ballots in box mismatch: received=%d - unused=%d - spoiled=%d = %d, but ballotsInBox=%d (delta: %d)",
                        received, unused, spoiled, expected, actual, delta))
                .details(Map.of(
                        "ballotsReceived", received,
                        "unusedBallots", unused,
                        "spoiledBallots", spoiled,
                        "expected", expected,
                        "ballotsInBox", actual,
                        "delta", delta
                ))
                .status(DiscrepancyStatus.OPEN)
                .createdAt(LocalDateTime.now())
                .build();

        return discrepancyRepository.save(disc);
    }



    /**
     * Create discrepancy for POST phase
     * Check: tally_sheet_photo (OCR) == agent_submitted
     *
     * This discrepancy is created when OCR results from tally sheet photos
     * differ from the agent's submitted vote counts.
     */
    @Override
    @Transactional
    public Discrepancy createOcrMismatchDiscrepancy(
            VoteSubmission submission,
            String fieldName,
            String expectedValue,
            String actualValue,
            Map<String, Object> details,
            DiscrepancySeverity severity) {

        // ✅ Validate inputs
        if (submission == null || submission.getSubmissionId() == null) {
            throw new ResponseStatusException(BAD_REQUEST, "VoteSubmission is required");
        }
        if (fieldName == null || fieldName.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "fieldName is required");
        }
        if (expectedValue == null || expectedValue.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "expectedValue is required");
        }
        if (actualValue == null || actualValue.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "actualValue is required");
        }

        // ✅ If OCR matches submitted, don't create discrepancy
        if (expectedValue.equals(actualValue)) {
            log.info("OCR matches submitted value for field '{}', no discrepancy created", fieldName);
            return null;
        }

        Discrepancy disc = Discrepancy.builder()
                .voteSubmission(submission)
                .election(submission.getElection())
                .pollingPlace(submission.getPollingPlace())
                .pollingCenter(submission.getPollingCenter())
                .organization(submission.getOrganization())
                .contestId(submission.getContestId())
                .discrepancyType(DiscrepancyType.OCR_MISMATCH)
                .reconciliationPhase(DiscrepancyReconciliationPhase.POST)
                .severity(severity)
                .fieldName(fieldName)
                .expectedValue(expectedValue)
                .actualValue(actualValue)
                .description(String.format(
                        "OCR mismatch on field '%s': submitted='%s', OCR='%s'",
                        fieldName, expectedValue, actualValue))
                .details(details != null ? details : new HashMap<>())
                .status(DiscrepancyStatus.OPEN)
                .createdAt(LocalDateTime.now())
                .build();

        return discrepancyRepository.save(disc);
    }



    // ===== AUTO-UPDATE DISCREPANCIES ON SUBMISSION CHANGE =====

    /**
     * Re-validate all discrepancies when submission is updated.
     * Called whenever VoteSubmission ballot/vote data changes.
     * Auto-resolves discrepancies that are no longer valid.
     * Creates new discrepancies if new mismatches appear.
     *
     * @param submission the updated vote submission
     * @param alloc polling place allocation for this submission
     */
    @Override
    @Transactional
    public void revalidateSubmissionDiscrepancies(VoteSubmission submission, PollingPlaceAllocationDto alloc) {
        if (submission == null || alloc == null) {
            return;
        }

        try {
            // ✅ Get all OPEN discrepancies for this submission
            List<Discrepancy> openDiscrepancies = submission.getDiscrepancies().stream()
                    .filter(d -> d.getStatus() == DiscrepancyStatus.OPEN)
                    .collect(Collectors.toList());

            // ✅ Determine current severity based on updated data
            DiscrepancySeverity currentSeverity = determineSeverity(submission, alloc);

            // ✅ Re-check each discrepancy type
            revalidateBallotStockMismatch(submission, alloc.getBallotsIssued(), openDiscrepancies, currentSeverity);
            revalidateBallotReconciliationMismatch(submission, alloc.getBallotsIssued(), openDiscrepancies, currentSeverity);
            revalidateVoteTallyMismatch(submission, openDiscrepancies, currentSeverity);
            revalidateBallotsInBoxMismatch(submission, openDiscrepancies, currentSeverity);

            // ✅ IMPORTANT: Refresh submission and update flag
            VoteSubmission refreshed = submissionRepository.findById(submission.getSubmissionId())
                    .orElse(submission);
            updateSubmissionDiscrepancyFlag(refreshed);

            log.info("Revalidated {} open discrepancies for submission {}",
                    openDiscrepancies.size(), submission.getSubmissionId());

        } catch (Exception ex) {
            log.warn("Error revalidating discrepancies for submission {}: {}",
                    submission.getSubmissionId(), ex.getMessage(), ex);
        }
    }




    /**
     * Re-validate BALLOT_STOCK_MISMATCH
     * Check: ballotsIssued == ballotsReceived
     */
    private void revalidateBallotStockMismatch(
            VoteSubmission submission,
            Integer ballotsIssued,
            List<Discrepancy> openDiscrepancies,
            DiscrepancySeverity currentSeverity) {

        Discrepancy existing = openDiscrepancies.stream()
                .filter(d -> d.getDiscrepancyType() == DiscrepancyType.BALLOT_STOCK_MISMATCH)
                .findFirst()
                .orElse(null);

        // ✅ Null-safe calculations
        int received = submission.getBallotsReceived() != null ? submission.getBallotsReceived() : 0;
        int expected = ballotsIssued != null ? ballotsIssued : 0;
        int actual = received;
        int delta = actual - expected;

        if (delta == 0) {
            // ✅ Mismatch resolved
            if (existing != null) {
                existing.setStatus(DiscrepancyStatus.RESOLVED);
                existing.setResolutionAction(DiscrepancyResolutionAction.ACCEPT_SUBMITTED);
                existing.setResolutionNotes("Revalidation: ballot stock now matches");
                existing.setResolvedAt(LocalDateTime.now());
                discrepancyRepository.save(existing);
                log.info("Auto-resolved ballot stock discrepancy for submission {}",
                        submission.getSubmissionId());
            }
        } else {
            // ✅ Mismatch still exists
            if (existing != null) {
                // Update existing discrepancy
                existing.setExpectedValue(String.valueOf(expected));
                existing.setActualValue(String.valueOf(actual));
                existing.setDelta(delta);
                existing.setSeverity(currentSeverity);
                existing.setDescription(String.format(
                        "Ballot stock mismatch: issued=%d, received=%d (delta: %d)",
                        expected, actual, delta));
                existing.setDetails(Map.of(
                        "ballotsIssued", expected,
                        "ballotsReceived", actual,
                        "delta", delta
                ));
                existing.setUpdatedAt(LocalDateTime.now());
                discrepancyRepository.save(existing);
                log.info("Updated ballot stock discrepancy for submission {}",
                        submission.getSubmissionId());
            }
        }
    }



    /**
     * Re-validate BALLOT_RECONCILIATION_MISMATCH
     * Check: ballotsIssued == ballotsInBox + unused + spoiled
     */
    private void revalidateBallotReconciliationMismatch(
            VoteSubmission submission,
            Integer ballotsIssued,
            List<Discrepancy> openDiscrepancies,
            DiscrepancySeverity currentSeverity) {

        Discrepancy existing = openDiscrepancies.stream()
                .filter(d -> d.getDiscrepancyType() == DiscrepancyType.BALLOT_RECONCILIATION_MISMATCH)
                .findFirst()
                .orElse(null);

        // ✅ Null-safe calculations
        int inBox = submission.getBallotsInBox() != null ? submission.getBallotsInBox() : 0;
        int rejected = submission.getRejectedBallots() != null ? submission.getRejectedBallots() : 0;
        int unused = submission.getUnusedBallots() != null ? submission.getUnusedBallots() : 0;
        int spoiled = submission.getSpoiledBallots() != null ? submission.getSpoiledBallots() : 0;

        long expected = (long) inBox + unused + spoiled;
        long actual = ballotsIssued != null ? ballotsIssued : 0;
        long delta = actual - expected;

        if (delta == 0) {
            // ✅ Mismatch resolved
            if (existing != null) {
                existing.setStatus(DiscrepancyStatus.RESOLVED);
                existing.setResolutionAction(DiscrepancyResolutionAction.ACCEPT_SUBMITTED);
                existing.setResolutionNotes("Revalidation: ballot reconciliation now matches");
                existing.setResolvedAt(LocalDateTime.now());
                discrepancyRepository.save(existing);
                log.info("Auto-resolved ballot reconciliation discrepancy for submission {}",
                        submission.getSubmissionId());
            }
        } else {
            // ✅ Mismatch still exists
            if (existing != null) {
                // Update existing discrepancy
                existing.setExpectedValue(String.valueOf(expected));
                existing.setActualValue(String.valueOf(actual));
                existing.setDelta((int) delta);
                existing.setSeverity(currentSeverity);
                existing.setDescription(String.format(
                        "Ballot reconciliation mismatch: issued=%d, expected (inBox=%d + unused=%d + spoiled=%d) = %d, delta=%d",
                        actual, inBox, unused, spoiled, expected, delta));
                existing.setDetails(Map.of(
                        "ballotsInBox", inBox,
                        "unused", unused,
                        "spoiled", spoiled,
                        "rejected", rejected,
                        "ballotsIssued", actual,
                        "expected", expected,
                        "delta", delta
                ));
                existing.setUpdatedAt(LocalDateTime.now());
                discrepancyRepository.save(existing);
                log.info("Updated ballot reconciliation discrepancy for submission {}",
                        submission.getSubmissionId());
            }
        }
    }


    /**
     * Re-validate VOTE_TALLY_MISMATCH
     * Check: ballotsInBox == sum(candidateVotes) + invalidBallots + unmarkedBallots + rejectedBallots
     */
    private void revalidateVoteTallyMismatch(
            VoteSubmission submission,
            List<Discrepancy> openDiscrepancies,
            DiscrepancySeverity currentSeverity) {

        Discrepancy existing = openDiscrepancies.stream()
                .filter(d -> d.getDiscrepancyType() == DiscrepancyType.VOTE_TALLY_MISMATCH)
                .findFirst()
                .orElse(null);

        // ✅ Calculate sum of candidate votes
        long sumVotes = submission.getCandidateVotes() != null ?
                submission.getCandidateVotes().values().stream()
                        .mapToLong(v -> v == null ? 0L : v.longValue()).sum() : 0L;

        // ✅ Get all invalid ballot counts
        int invalid = submission.getInvalidBallots() != null ? submission.getInvalidBallots() : 0;
        int unmarked = submission.getUnmarkedBallots() != null ? submission.getUnmarkedBallots() : 0;
        int rejected = submission.getRejectedBallots() != null ? submission.getRejectedBallots() : 0;
        int inBox = submission.getBallotsInBox() != null ? submission.getBallotsInBox() : 0;

        long expected = sumVotes + invalid + unmarked + rejected;
        long actual = inBox;
        long delta = actual - expected;

        if (delta == 0) {
            // ✅ Mismatch resolved
            if (existing != null) {
                existing.setStatus(DiscrepancyStatus.RESOLVED);
                existing.setResolutionAction(DiscrepancyResolutionAction.ACCEPT_SUBMITTED);
                existing.setResolutionNotes("Revalidation: vote tally now matches");
                existing.setResolvedAt(LocalDateTime.now());
                discrepancyRepository.save(existing);
                log.info("Auto-resolved vote tally discrepancy for submission {}",
                        submission.getSubmissionId());
            }
        } else {
            // ✅ Mismatch still exists
            if (existing != null) {
                // Update existing discrepancy
                existing.setExpectedValue(String.valueOf(expected));
                existing.setActualValue(String.valueOf(actual));
                existing.setDelta((int) delta);
                existing.setSeverity(currentSeverity);
                existing.setDescription(String.format(
                        "Vote tally mismatch: ballotsInBox=%d, expected (votes=%d + invalid=%d + unmarked=%d + rejected=%d) = %d, delta=%d",
                        actual, sumVotes, invalid, unmarked, rejected, expected, delta));
                existing.setDetails(Map.of(
                        "candidateVotesSum", sumVotes,
                        "invalidBallots", invalid,
                        "unmarkedBallots", unmarked,
                        "rejectedBallots", rejected,
                        "ballotsInBox", actual,
                        "expected", expected,
                        "delta", delta
                ));
                existing.setUpdatedAt(LocalDateTime.now());
                discrepancyRepository.save(existing);
                log.info("Updated vote tally discrepancy for submission {}",
                        submission.getSubmissionId());
            }
        }
    }


    /**
     * Re-validate BALLOTS_IN_BOX_MISMATCH
     * Check: ballotsInBox == ballotsReceived - unused - spoiled
     */
    private void revalidateBallotsInBoxMismatch(
            VoteSubmission submission,
            List<Discrepancy> openDiscrepancies,
            DiscrepancySeverity currentSeverity) {

        Discrepancy existing = openDiscrepancies.stream()
                .filter(d -> d.getDiscrepancyType() == DiscrepancyType.BALLOTS_IN_BOX_MISMATCH)
                .findFirst()
                .orElse(null);

        // ✅ Null-safe calculations
        int received = submission.getBallotsReceived() != null ? submission.getBallotsReceived() : 0;
        int unused = submission.getUnusedBallots() != null ? submission.getUnusedBallots() : 0;
        int spoiled = submission.getSpoiledBallots() != null ? submission.getSpoiledBallots() : 0;
        int inBox = submission.getBallotsInBox() != null ? submission.getBallotsInBox() : 0;

        int expected = received - unused - spoiled;
        int actual = inBox;
        int delta = actual - expected;

        if (delta == 0) {
            // ✅ Mismatch resolved
            if (existing != null) {
                existing.setStatus(DiscrepancyStatus.RESOLVED);
                existing.setResolutionAction(DiscrepancyResolutionAction.ACCEPT_SUBMITTED);
                existing.setResolutionNotes("Revalidation: ballots in box calculation now matches");
                existing.setResolvedAt(LocalDateTime.now());
                discrepancyRepository.save(existing);
                log.info("Auto-resolved ballots in box discrepancy for submission {}",
                        submission.getSubmissionId());
            }
        } else {
            // ✅ Mismatch still exists
            if (existing != null) {
                // Update existing discrepancy
                existing.setExpectedValue(String.valueOf(expected));
                existing.setActualValue(String.valueOf(actual));
                existing.setDelta(delta);
                existing.setSeverity(currentSeverity);
                existing.setDescription(String.format(
                        "Ballots in box mismatch: received=%d - unused=%d - spoiled=%d = %d, but ballotsInBox=%d (delta: %d)",
                        received, unused, spoiled, expected, actual, delta));
                existing.setDetails(Map.of(
                        "ballotsReceived", received,
                        "unusedBallots", unused,
                        "spoiledBallots", spoiled,
                        "expected", expected,
                        "ballotsInBox", actual,
                        "delta", delta
                ));
                existing.setUpdatedAt(LocalDateTime.now());
                discrepancyRepository.save(existing);
                log.info("Updated ballots in box discrepancy for submission {}",
                        submission.getSubmissionId());
            }
        }
    }



    /**
     * Determine severity of discrepancy based on ballot delta percentage
     */
    private DiscrepancySeverity determineSeverity(VoteSubmission submission, PollingPlaceAllocationDto alloc) {
        try {
            // ✅ Get ballot counts
            int ballotsInBox = submission.getBallotsInBox() != null ? submission.getBallotsInBox() : 0;
            int ballotsIssued = alloc.getBallotsIssued() != null ? alloc.getBallotsIssued() : 0;
            int delta = Math.abs(ballotsIssued - ballotsInBox);

            // ✅ Get registered voters (use primitive int directly)
            int registeredVoters = alloc.getRegisteredVoters();
            if (registeredVoters <= 0) {
                registeredVoters = 1; // Prevent division by zero
            }

            // ✅ Calculate delta percentage
            double deltaPercentage = (double) delta / registeredVoters * 100;

            // ✅ Determine severity based on percentage
            if (deltaPercentage > 5.0) {
                return DiscrepancySeverity.HIGH;
            } else if (deltaPercentage > 1.0) {
                return DiscrepancySeverity.MEDIUM;
            } else {
                return DiscrepancySeverity.LOW;
            }

        } catch (Exception ex) {
            log.warn("Error calculating severity: {}", ex.getMessage());
            return DiscrepancySeverity.MEDIUM; // Default to medium
        }
    }

    /**
     * Update submission's hasDiscrepancies flag based on OPEN discrepancies
     */
    private void updateSubmissionDiscrepancyFlag(VoteSubmission submission) {
        if (submission == null || submission.getSubmissionId() == null) {
            return;
        }

        try {
            // ✅ Refresh submission from DB to get latest discrepancies
            VoteSubmission refreshed = submissionRepository.findById(submission.getSubmissionId())
                    .orElse(submission);

            // ✅ Count OPEN discrepancies directly from DB
            long openCount = discrepancyRepository.countByVoteSubmission_SubmissionIdAndStatus(
                    refreshed.getSubmissionId(),
                    DiscrepancyStatus.OPEN
            );

            // ✅ Update flag based on DB count
            boolean hasOpen = openCount > 0;
            refreshed.setHasDiscrepancies(hasOpen);
            submissionRepository.save(refreshed);

            log.info("Updated hasDiscrepancies flag to {} for submission {} (found {} open discrepancies)",
                    hasOpen, refreshed.getSubmissionId(), openCount);

        } catch (Exception ex) {
            log.warn("Error updating discrepancy flag for submission {}: {}",
                    submission.getSubmissionId(), ex.getMessage(), ex);
        }
    }


    // ===== RESOLUTION =====

    /**
     * Resolve a discrepancy based on supervisor decision
     */
    @Override
    @Transactional
    public Discrepancy resolveDiscrepancy(
            UUID discrepancyId,
            UUID supervisorId,
            DiscrepancyResolutionDto request) {

        Discrepancy disc = discrepancyRepository.findById(discrepancyId)
                .orElseThrow(() -> new EntityNotFoundException("Discrepancy not found"));

        SystemUser supervisor = null; // Load supervisor user if needed for audit

        // Validate discrepancy is still open
        if (disc.getStatus() != DiscrepancyStatus.OPEN) {
            throw new InvalidStateException("Discrepancy is already resolved");
        }

        // Update resolution fields
        disc.setResolvedBy(supervisor);
        disc.setResolvedAt(LocalDateTime.now());
        disc.setResolutionNotes(request.getResolutionNotes());
        disc.setResolutionAction(request.getResolutionAction());

        // Handle resolution action
        switch (request.getResolutionAction()) {
            case ACCEPT_SUBMITTED:
                disc.setStatus(DiscrepancyStatus.ACCEPTED);
                handleAcceptSubmitted(disc);
                break;

            case REQUEST_CORRECTION:
                disc.setStatus(DiscrepancyStatus.INVESTIGATING);
                handleRequestCorrection(disc);
                break;

            case ESCALATE_TO_JUDGE:
                disc.setStatus(DiscrepancyStatus.INVESTIGATING);
                handleEscalateToJudge(disc);
                break;
        }

        Discrepancy resolved = discrepancyRepository.save(disc);

        // Check if all discrepancies for submission are resolved
        checkSubmissionStatus(resolved.getVoteSubmission());

        return resolved;
    }

    private void handleAcceptSubmitted(Discrepancy disc) {
        VoteSubmission submission = disc.getVoteSubmission();
        submission.setHasDiscrepancies(false);
        submissionRepository.save(submission);
    }

    private void handleRequestCorrection(Discrepancy disc) {
        VoteSubmission submission = disc.getVoteSubmission();
        submission.setStatus(VoteStatus.FLAGGED);
        submissionRepository.save(submission);

        notificationService.notifyAgent(
                submission.getAgent(),
                "Discrepancy Found - Action Required",
                "Please review and correct your submission. Discrepancy: " + disc.getDescription()
        );
    }

    private void handleEscalateToJudge(Discrepancy disc) {
        VoteSubmission submission = disc.getVoteSubmission();
        submission.setStatus(VoteStatus.FLAGGED);
        submissionRepository.save(submission);

        notificationService.notifyJudge(
                disc.getElection(),
                "Discrepancy Escalation - Judge Review Required",
                "Discrepancy requires judge decision: " + disc.getDescription()
        );
    }

    private void checkSubmissionStatus(VoteSubmission submission) {
        boolean allResolved = submission.getDiscrepancies().stream()
                .allMatch(d -> d.isResolved());

        if (allResolved && submission.getStatus() == VoteStatus.FLAGGED) {
            submission.setStatus(VoteStatus.READY_FOR_VERIFICATION);
            submission.setHasDiscrepancies(false);
            submissionRepository.save(submission);
        }
    }

    // ===== SEARCH & RETRIEVAL =====

    /**
     * Search discrepancies with filters and pagination
     */
    @Override
    @Transactional(readOnly = true)
    public Page<DiscrepancyResponseDto> search(DiscrepancyFilterDto filter, Pageable pageable) {
        Specification<Discrepancy> spec = buildSpecification(filter);
        return discrepancyRepository.findAll(spec, pageable)
                .map(mapper::toResponseDto);
    }

    /**
     * Get single discrepancy by ID
     */
    @Override
    @Transactional(readOnly = true)
    public DiscrepancyResponseDto getById(UUID id) {
        return discrepancyRepository.findById(id)
                .map(mapper::toResponseDto)
                .orElseThrow(() -> new EntityNotFoundException("Discrepancy not found"));
    }

    /**
     * Get all discrepancies for a submission
     */
    @Override
    @Transactional(readOnly = true)
    public List<DiscrepancySummaryDto> getBySubmission(UUID submissionId) {
        VoteSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new EntityNotFoundException("Submission not found"));

        return submission.getDiscrepancies().stream()
                .map(mapper::toSummaryDto)
                .collect(Collectors.toList());
    }

    /**
     * Get all OPEN discrepancies for an election
     */
    @Override
    @Transactional(readOnly = true)
    public List<DiscrepancySummaryDto> getOpenByElection(UUID electionId) {
        return discrepancyRepository.findByElection_ElectionIdAndStatus(
                        electionId, DiscrepancyStatus.OPEN)
                .stream()
                .map(mapper::toSummaryDto)
                .collect(Collectors.toList());
    }

    /**
     * Count OPEN discrepancies for an election
     */
    @Override
    @Transactional(readOnly = true)
    public long countOpenByElection(UUID electionId) {
        return discrepancyRepository.countByElection_ElectionIdAndStatus(
                electionId, DiscrepancyStatus.OPEN);
    }

    // ===== SPECIFICATION BUILDER =====

    private Specification<Discrepancy> buildSpecification(DiscrepancyFilterDto filter) {
        return Specification
                .where(DiscrepancySpecs.electionEquals(filter.getElectionId()))
                .and(DiscrepancySpecs.centerEquals(filter.getCenterId()))
                .and(DiscrepancySpecs.placeEquals(filter.getPlaceId()))
                .and(DiscrepancySpecs.typeEquals(filter.getDiscrepancyType()))
                .and(DiscrepancySpecs.phaseEquals(filter.getReconciliationPhase()))
                .and(DiscrepancySpecs.severityEquals(filter.getSeverity()))
                .and(DiscrepancySpecs.statusEquals(filter.getStatus()))
                .and(DiscrepancySpecs.createdAfter(filter.getCreatedFromDate()))
                .and(DiscrepancySpecs.createdBefore(filter.getCreatedToDate()));
    }


}