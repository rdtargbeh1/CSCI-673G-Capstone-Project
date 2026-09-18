package election.ems_backend.nec;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import election.ems_backend.entity.*;
import election.ems_backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Slf4j
@Service
@RequiredArgsConstructor
public class NecResultAutoPopulateService {

    private final VoteSubmissionRepository voteSubmissionRepository;
    private final NECResultRepository necResultRepository;
    private final ElectionRepository electionRepository;
    private final ContestRepository contestRepository;
    private final PollingCenterRepository centerRepository;
    private final PollingCenterAllocationRepository allocationRepository;

    private static final ObjectMapper OM = new ObjectMapper();

    /**
     * Aggregate all VERIFIED NEC submissions for (necOrgId, electionId, contestId, centerId)
     * into a single NECResult draft row.
     *
     * IMPORTANT:
     * - Does NOT overwrite published results.
     * - NECResult.candidateVotes is jsonb mapped as JsonNode.
     * - VoteSubmission.candidateVotes assumed to be Map<String,Integer>.
     */
    @Transactional
    public void recomputeCenter(UUID necOrgId,
                                UUID electionId,
                                UUID contestId,
                                UUID centerId,
                                UUID actorUserId) {

        if (necOrgId == null || electionId == null || contestId == null || centerId == null) {
            throw new ResponseStatusException(BAD_REQUEST, "necOrgId, electionId, contestId, centerId are required");
        }

        Election election = electionRepository.findById(electionId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Election not found"));

        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Contest not found"));

        PollingCenter center = centerRepository.findById(centerId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Polling center not found"));

        PollingCenterAllocation alloc = allocationRepository
                .findByElection_ElectionIdAndPollingCenter_CenterId(electionId, centerId)
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Center is not allocated for this election"));

        // Load all VERIFIED submissions for this NEC org + scope
        List<VoteSubmission> subs =
                voteSubmissionRepository.findVerifiedForNecCenter(necOrgId, electionId, contestId, centerId);

        if (subs.isEmpty()) {
            log.info("NEC recompute: no VERIFIED submissions found for necOrgId={}, election={}, contest={}, center={}",
                    necOrgId, electionId, contestId, centerId);

            return;
        }

        // Aggregate all submissions in scope
        Map<String, Integer> mergedVotes = new TreeMap<>();
        long ballotsInBox = 0;
        long invalid = 0;
        long unmarked = 0;
        long rejected = 0;
        long spoiled = 0;
        long unused = 0;

        for (VoteSubmission s : subs) {
            ballotsInBox += nz(s.getBallotsInBox());
            invalid += nz(s.getInvalidBallots());
            unmarked += nz(s.getUnmarkedBallots());
            rejected += nz(s.getRejectedBallots());
            spoiled += nz(s.getSpoiledBallots());
            unused += nz(s.getUnusedBallots());

            Map<String, Integer> v = (s.getCandidateVotes() == null) ? Map.of() : s.getCandidateVotes();

            for (Map.Entry<String, Integer> e : v.entrySet()) {
                String key = e.getKey();
                Integer val = e.getValue();
                if (key == null || key.isBlank()) continue;
                mergedVotes.merge(key, val == null ? 0 : val, Integer::sum);
            }
        }

        JsonNode votesNode = toJsonNodeVotes(mergedVotes);

        // Integrity check
        validateTallyInternal(
                sumVotes(mergedVotes),
                (int) invalid,
                (int) unmarked,
                (int) rejected,
                (int) spoiled,
                (int) unused,
                (int) ballotsInBox,
                alloc.getRegisteredVoters(),
                alloc.getBallotsIssued()
        );

        // Upsert by election+contest+center
        NECResult entity = necResultRepository
                .findByElection_ElectionIdAndContest_ContestIdAndPollingCenter_CenterId(electionId, contestId, centerId)
                .orElseGet(NECResult::new);

        // Do not overwrite published
        if (entity.getResultId() != null && entity.isPublished()) {
            log.warn("NEC recompute blocked: NECResult is already PUBLISHED (resultId={}).", entity.getResultId());
            return;
        }

        entity.setElection(election);
        entity.setContest(contest);
        entity.setPollingCenter(center);

        // ✅ FIX: JsonNode not String
        entity.setCandidateVotes(votesNode);

        entity.setTotalRegisteredVoters(alloc.getRegisteredVoters());
        entity.setBallotsInBox((int) ballotsInBox);
        entity.setInvalidBallots((int) invalid);
        entity.setUnmarkedBallots((int) unmarked);
        entity.setRejectedBallots((int) rejected);
        entity.setSpoiledBallots((int) spoiled);
        entity.setUnusedBallots((int) unused);

        entity.setSource("AUTO_FROM_NEC_SUBMISSIONS");
        entity.setUploadTime(LocalDateTime.now());
        entity.setPublished(false);
        entity.setPublishedAt(null);

        necResultRepository.save(entity);

        log.info("NEC recompute OK (draft) election={} contest={} center={} submissions={}",
                electionId, contestId, centerId, subs.size());
    }

    // -------------------
    // Helpers
    // -------------------
    private static int nz(Integer x) { return x == null ? 0 : x; }

    private static long sumVotes(Map<String, Integer> m) {
        if (m == null || m.isEmpty()) return 0L;
        return m.values().stream().mapToLong(v -> v == null ? 0L : v.longValue()).sum();
    }

    /** Map<String,Integer> -> JsonNode object (jsonb friendly) */
    private static JsonNode toJsonNodeVotes(Map<String, Integer> m) {
        ObjectNode obj = OM.createObjectNode();
        if (m == null) return obj;

        for (Map.Entry<String, Integer> e : m.entrySet()) {
            String k = e.getKey();
            if (k == null || k.isBlank()) continue;
            obj.put(k, e.getValue() == null ? 0 : e.getValue());
        }
        return obj;
    }

    // same accounting rule you already enforce
    private static void validateTallyInternal(long sumVotes,
                                              int invalid,
                                              int unmarked,
                                              int rejected,
                                              int spoiled,
                                              int unused,
                                              int ballotsInBox,
                                              int registered,
                                              Integer ballotsIssued) {

        if (ballotsInBox < 0 || registered < 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Negative counts are not allowed");
        }
        if (invalid < 0 || unmarked < 0 || rejected < 0 || spoiled < 0 || unused < 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Negative category counts are not allowed");
        }
        if (sumVotes < 0) {
            throw new ResponseStatusException(BAD_REQUEST, "sumVotes cannot be negative");
        }

        // inside-box strict
        long insideBox = sumVotes + (long) invalid + unmarked + rejected;
        if (insideBox != ballotsInBox) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "ballotsInBox mismatch (NEC auto). Expected ballotsInBox = validVotes + invalid + unmarked + rejected"
            );
        }

        // issued strict (if available): issued = inBox + unused + spoiled
        if (ballotsIssued != null) {
            long handled = (long) ballotsInBox + unused + spoiled;
            if (handled != ballotsIssued) {
                throw new ResponseStatusException(
                        BAD_REQUEST,
                        "ballotsIssued mismatch (NEC auto). Expected ballotsIssued = ballotsInBox + unused + spoiled"
                );
            }
        }

        if (ballotsInBox > registered) {
            throw new ResponseStatusException(BAD_REQUEST, "ballotsInBox exceeds registered voters");
        }
    }

}
