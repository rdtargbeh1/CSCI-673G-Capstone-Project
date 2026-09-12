package election.ems_backend.service.implement;

import election.ems_backend.dto.*;
import election.ems_backend.entity.Contest;
import election.ems_backend.entity.ContestOption;
import election.ems_backend.entity.VoteSubmission;
import election.ems_backend.entity.VoteSubmissionContest;
import election.ems_backend.enums.ContestVoteMethod;
import election.ems_backend.enums.VoteStatus;
import election.ems_backend.mapper.VoteSubmissionContestMapper;
import election.ems_backend.repository.ContestOptionRepository;
import election.ems_backend.repository.ContestRepository;
import election.ems_backend.repository.VoteSubmissionContestRepository;
import election.ems_backend.repository.VoteSubmissionRepository;
import election.ems_backend.service.VoteSubmissionContestService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

/**
 * Normalizes VoteSubmission.candidate_votes -> submission_contest_vote (normalized table).
 *
 * Behavior and decisions:
 * - Idempotent: remove prior submission_contest_vote rows for the submission before inserting updated ones.
 * - Mapping: For each candidateId key in candidate_votes, attempts to resolve a ContestOption by candidateId.
 *   If multiple options exist, the first match is used. If none found, that candidate's votes are skipped,
 *   and a warning is logged (but the process continues).
 * - Vote values are inserted as-is (must be >= 0). Rank is null (unless ranking information is available elsewhere).
 */
@Service
@RequiredArgsConstructor
public class VoteSubmissionContestServiceImplementation implements VoteSubmissionContestService {

    private final VoteSubmissionContestRepository scvRepo;
    private final VoteSubmissionRepository vsRepo;
    private final ContestOptionRepository optionRepo;
    private final ContestRepository contestRepo;
    private final VoteSubmissionContestMapper mapper;





    @Override
    @Transactional
    public int normalizeSubmission(UUID submissionId) {

        VoteSubmission vs = vsRepo.findById(submissionId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Submission not found: " + submissionId));

        UUID orgId = (vs.getOrganization() != null ? vs.getOrganization().getOrgId() : null);
        UUID electionId = (vs.getElection() != null ? vs.getElection().getElectionId() : null);
        UUID contestId = vs.getContestId();

        if (orgId == null) throw new ResponseStatusException(BAD_REQUEST, "Submission missing orgId (organization).");
        if (electionId == null) throw new ResponseStatusException(BAD_REQUEST, "Submission missing electionId.");
        if (contestId == null) throw new ResponseStatusException(BAD_REQUEST, "Submission missing contestId.");

        // Idempotent: clear ONLY this submission+contest (not all contests)
        scvRepo.deleteBySubmissionAndContest(submissionId, contestId);

        Map<String, Integer> candidateVotes = vs.getCandidateVotes();
        if (candidateVotes == null || candidateVotes.isEmpty()) {
            return 0;
        }

        // OPTIONAL safety: if contest is RANKED, don't normalize counts here
        Contest contest = contestRepo.findById(contestId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Contest not found: " + contestId));
        if (contest.getVoteMethod() == ContestVoteMethod.RANKED) {
            // ranked ballots should come from VoteSubmissionRanking or ranked rows, not counts map
            return 0;
        }

        // Parse electIds from JSON keys
        List<UUID> electIds = new ArrayList<>(candidateVotes.size());
        for (String k : candidateVotes.keySet()) {
            if (k == null || k.isBlank()) continue;
            try {
                electIds.add(UUID.fromString(k));
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(BAD_REQUEST, "Invalid electId in candidateVotes: " + k);
            }
        }
        if (electIds.isEmpty()) return 0;

        // Fetch options ONLY for this contest + these electIds (batch)
        List<ContestOption> opts = optionRepo.findCandidateOptionsIn(
                contestId,
                election.ems_backend.enums.ContestOptionType.CANDIDATE,
                electIds
        );

        Map<UUID, UUID> optionIdByElectId = new HashMap<>();
        for (ContestOption co : opts) {
            if (co.getElectId() != null && co.getOptionId() != null) {
                optionIdByElectId.putIfAbsent(co.getElectId(), co.getOptionId());
            }
        }

        List<VoteSubmissionContest> rows = new ArrayList<>(candidateVotes.size());
        int created = 0;

        for (Map.Entry<String, Integer> e : candidateVotes.entrySet()) {
            String electKey = e.getKey();
            Integer votes = e.getValue();

            if (electKey == null || electKey.isBlank() || votes == null) continue;

            UUID electId = UUID.fromString(electKey);
            UUID optionId = optionIdByElectId.get(electId);

            // If your VoteSubmission validation is correct, this should always exist.
            if (optionId == null) {
                throw new ResponseStatusException(
                        BAD_REQUEST,
                        "No active contest_option for electId=" + electId + " in contestId=" + contestId
                );
            }

            int safeVotes = Math.max(0, votes);

            VoteSubmissionContest scv = new VoteSubmissionContest();
            scv.setSubmissionId(submissionId);
            scv.setOrgId(orgId);
            scv.setElectionId(electionId);
            scv.setContestId(contestId);
            scv.setOptionId(optionId);
            scv.setVoteValue(safeVotes);
            scv.setRank(null);

            rows.add(scv);
            created++;
        }

        scvRepo.saveAll(rows);
        return created;
    }


    @Override
    @Transactional
    public int normalizeVerifiedSubmissionsForElection(UUID electionId) {

        // adjust query to match your repository method exactly
        List<VoteSubmission> subs = vsRepo
                .findByElection_ElectionIdAndStatusAndDateDeletedIsNull(electionId, VoteStatus.VERIFIED);

        int total = 0;
        for (VoteSubmission vs : subs) {
            total += normalizeSubmission(vs.getSubmissionId());
        }
        return total;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<VoteSubmissionContestRepository.SubmissionContestRowView> search(
            UUID orgId,
            UUID electionId,
            UUID countyId,
            UUID districtId,
            UUID centerId,
            UUID contestId,
            UUID candidateId,
            Pageable pageable
    ) {
        return scvRepo.search(
                orgId, electionId,
                countyId, districtId, centerId,
                contestId, candidateId,
                pageable
        );
    }

    @Override
    @Transactional(readOnly = true)
    public VoteSubmissionContestDto get(UUID scvId) {
        return scvRepo.findById(scvId)
                .map(mapper::toDto)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Vote row not found"));
    }





}