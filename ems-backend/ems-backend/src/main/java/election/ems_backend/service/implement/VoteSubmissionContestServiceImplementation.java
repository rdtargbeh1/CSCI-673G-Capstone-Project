package election.ems_backend.service.implement;

import election.ems_backend.dto.VoteSubmissionContestBulkRequest;
import election.ems_backend.dto.VoteSubmissionContestCreateRequest;
import election.ems_backend.dto.VoteSubmissionContestDto;
import election.ems_backend.dto.VoteSubmissionContestUpdateRequest;
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
    public VoteSubmissionContestDto createOrUpdate(VoteSubmissionContestCreateRequest req) {
        // Validate contest + method rules
        Contest contest = contestRepo.findById(req.getContestId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Contest not found"));

        // contest must belong to election (matches FK composite in SQL)
        if (!Objects.equals(contest.getElectionId(), req.getElectionId())) {
            throw new ResponseStatusException(BAD_REQUEST, "contestId does not belong to electionId.");
        }

        // option must belong to contest (matches composite FK in SQL)
        ContestOption option = optionRepo.findById(req.getOptionId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Contest option not found"));
        if (!Objects.equals(option.getContestId(), req.getContestId())) {
            throw new ResponseStatusException(BAD_REQUEST, "optionId does not belong to contestId.");
        }

        validateRankRules(contest.getVoteMethod(), req.getRank());

        int vv = req.getVoteValue() == null ? 0 : req.getVoteValue();
        if (vv < 0) throw new ResponseStatusException(BAD_REQUEST, "voteValue must be >= 0.");

        // Enforce uniqueness rule from SQL: (submission, contest, option, coalesce(rank,0))
        VoteSubmissionContest entity = scvRepo.findUnique(req.getSubmissionId(), req.getContestId(), req.getOptionId(), req.getRank())
                .orElseGet(VoteSubmissionContest::new);

        entity.setSubmissionId(req.getSubmissionId());
        entity.setOrgId(req.getOrgId());
        entity.setElectionId(req.getElectionId());
        entity.setContestId(req.getContestId());
        entity.setOptionId(req.getOptionId());

        entity.setVoteValue(vv);
        entity.setRank(req.getRank());

        VoteSubmissionContest saved = scvRepo.save(entity);
        return mapper.toDto(saved);
    }

    @Override
    public VoteSubmissionContestDto update(UUID scvId, VoteSubmissionContestUpdateRequest req) {
        VoteSubmissionContest entity = scvRepo.findById(scvId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Vote row not found"));

        Contest contest = contestRepo.findById(entity.getContestId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Contest not found"));

        if (req.getVoteValue() != null) {
            if (req.getVoteValue() < 0) throw new ResponseStatusException(BAD_REQUEST, "voteValue must be >= 0.");
            entity.setVoteValue(req.getVoteValue());
        }

        if (req.getRank() != null || (req.getRank() == null && contest.getVoteMethod() != ContestVoteMethod.RANKED)) {
            // if user explicitly sets rank (or tries to clear it), validate rules
            validateRankRules(contest.getVoteMethod(), req.getRank());
            entity.setRank(req.getRank());
        }

        VoteSubmissionContest saved = scvRepo.save(entity);
        return mapper.toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public VoteSubmissionContestDto get(UUID scvId) {
        return scvRepo.findById(scvId)
                .map(mapper::toDto)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Vote row not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public List<VoteSubmissionContestDto> listBySubmission(UUID submissionId) {
        return scvRepo.findBySubmissionIdOrderByDateCreatedAsc(submissionId)
                .stream().map(mapper::toDto).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<VoteSubmissionContestDto> listBySubmissionAndContest(UUID submissionId, UUID contestId) {
        return scvRepo.findBySubmissionIdAndContestIdOrderByDateCreatedAsc(submissionId, contestId)
                .stream().map(mapper::toDto).collect(Collectors.toList());
    }

    @Override
    public void delete(UUID scvId) {
        if (!scvRepo.existsById(scvId)) {
            throw new ResponseStatusException(NOT_FOUND, "Vote row not found");
        }
        scvRepo.deleteById(scvId);
    }

    @Override
    public List<VoteSubmissionContestDto> replaceContestVotes(VoteSubmissionContestBulkRequest req) {
        Contest contest = contestRepo.findById(req.getContestId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Contest not found"));

        if (!Objects.equals(contest.getElectionId(), req.getElectionId())) {
            throw new ResponseStatusException(BAD_REQUEST, "contestId does not belong to electionId.");
        }

        // validate each item + option belongs to contest + rank rules
        Set<UUID> optionIds = req.getItems().stream().map(VoteSubmissionContestBulkRequest.Item::getOptionId).collect(Collectors.toSet());
        if (optionIds.contains(null)) {
            throw new ResponseStatusException(BAD_REQUEST, "optionId cannot be null.");
        }

        // Fast verify options exist & belong
        for (UUID optionId : optionIds) {
            ContestOption option = optionRepo.findById(optionId)
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Contest option not found: " + optionId));
            if (!Objects.equals(option.getContestId(), req.getContestId())) {
                throw new ResponseStatusException(BAD_REQUEST, "optionId does not belong to contestId: " + optionId);
            }
        }

        // Replace pattern: delete existing votes for this submission+contest then insert new set
        scvRepo.deleteBySubmissionAndContest(req.getSubmissionId(), req.getContestId());

        List<VoteSubmissionContest> toSave = new ArrayList<>();
        for (VoteSubmissionContestBulkRequest.Item it : req.getItems()) {
            Integer voteValue = it.getVoteValue() == null ? 0 : it.getVoteValue();
            if (voteValue < 0) throw new ResponseStatusException(BAD_REQUEST, "voteValue must be >= 0.");

            validateRankRules(contest.getVoteMethod(), it.getRank());

            VoteSubmissionContest v = new VoteSubmissionContest();
            v.setSubmissionId(req.getSubmissionId());
            v.setOrgId(req.getOrgId());
            v.setElectionId(req.getElectionId());
            v.setContestId(req.getContestId());
            v.setOptionId(it.getOptionId());
            v.setVoteValue(voteValue);
            v.setRank(it.getRank());
            toSave.add(v);
        }

        List<VoteSubmissionContest> saved = scvRepo.saveAll(toSave);

        // Return fresh list for UI
        return saved.stream()
                .sorted(Comparator.comparing(VoteSubmissionContest::getDateCreated, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(mapper::toDto)
                .collect(Collectors.toList());
    }


    @Override
    @Transactional
    public int normalizeSubmission(UUID submissionId) {

        VoteSubmission vs = vsRepo.findById(submissionId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Submission not found: " + submissionId));

        // adjust this line to your real field
        Map<String, Integer> candidateVotes = vs.getCandidateVotes();
        if (candidateVotes == null || candidateVotes.isEmpty()) {
            scvRepo.deleteBySubmissionId(submissionId); // keep truly idempotent
            return 0;
        }

        UUID orgId = vs.getOrganization() != null ? vs.getOrganization().getOrgId() : null;
        UUID electionId = vs.getElection() != null ? vs.getElection().getElectionId() : null;

        if (orgId == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Submission missing orgId (organization).");
        }
        if (electionId == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Submission missing electionId.");
        }

        // idempotency
        scvRepo.deleteBySubmissionId(submissionId);

        int created = 0;

        for (Map.Entry<String, Integer> e : candidateVotes.entrySet()) {
            String candidateKey = e.getKey();
            Integer votes = e.getValue();

            if (candidateKey == null || candidateKey.isBlank() || votes == null) continue;

            UUID electId;
            try {
                electId = UUID.fromString(candidateKey);
            } catch (IllegalArgumentException ex) {
                continue; // skip invalid id
            }

            int safeVotes = Math.max(0, votes);

            // ✅ choose options that match this election
            List<ContestOption> options = optionRepo.findActiveByElectIdAndElectionId(electId, electionId);
            if (options == null || options.isEmpty()) {
                // No mapping for this candidate in this election’s contests
                // Skip. Operator must fix contest_option assignments.
                continue;
            }

            // If candidate is assigned to multiple contests in same election (rare but possible),
            // we normalize ALL of them (safer than picking first).
            for (ContestOption opt : options) {
                VoteSubmissionContest scv = new VoteSubmissionContest();
                scv.setSubmissionId(submissionId);
                scv.setOrgId(orgId);
                scv.setElectionId(electionId);
                scv.setContestId(opt.getContestId());
                scv.setOptionId(opt.getOptionId());
                scv.setVoteValue(safeVotes);
                scv.setRank(null); // this normalize path is for classic totals; ranked handled elsewhere

                scvRepo.save(scv);
                created++;
            }
        }

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


    private void validateRankRules(ContestVoteMethod method, Integer rank) {
        if (method == ContestVoteMethod.RANKED) {
            if (rank == null || rank < 1) {
                throw new ResponseStatusException(BAD_REQUEST, "rank is required (>=1) for RANKED contests.");
            }
        } else {
            if (rank != null) {
                throw new ResponseStatusException(BAD_REQUEST, "rank must be null for non-RANKED contests.");
            }
        }
    }



}