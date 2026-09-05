package election.ems_backend.service.implement;

import election.ems_backend.dto.ContestCandidateBulkAssignRequest;
import election.ems_backend.dto.ContestOptionCreateRequest;
import election.ems_backend.dto.ContestOptionDto;
import election.ems_backend.dto.ContestOptionUpdateRequest;
import election.ems_backend.entity.Contest;
import election.ems_backend.entity.ContestOption;
import election.ems_backend.enums.ContestOptionType;
import election.ems_backend.enums.ContestStatus;
import election.ems_backend.mapper.ContestOptionMapper;
import election.ems_backend.repository.ContestOptionRepository;
import election.ems_backend.repository.ContestRepository;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.service.ContestOptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.NOT_FOUND;

/**
 * Service implementing ContestOption CRUD and helpers.
 *
 * Behavior/decisions:
 * - createOption: ensures referenced contest exists, sets option_order automatically if not provided.
 * - updateOption: allows updates to label, candidateId, isActive, optionOrder.
 * - deleteOption: removes option by id.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ContestOptionServiceImpl implements ContestOptionService {

    private final ContestOptionRepository optionRepo;
    private final ContestRepository contestRepo;

    private final AuthorizationService authz;
    private final ContestOptionMapper contestOptionMapper = new ContestOptionMapper();

    @Override
    @Transactional
    public ContestOptionDto createOption(ContestOptionCreateRequest req) {
        authz.requireNecAdminOrPlatformAdmin();

        if (req == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request body is required");
        }
        if (req.getContestId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "contestId is required");
        }

        Contest contest = contestRepo.findById(req.getContestId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Contest not found"));

        if (contest.getStatus() == ContestStatus.LOCKED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Contest is LOCKED. Options cannot be modified.");
        }

        ContestOptionType type = (req.getOptionType() == null)
                ? ContestOptionType.CANDIDATE
                : req.getOptionType();

        // ===========================
        // CANDIDATE OPTION
        // ===========================
        if (type == ContestOptionType.CANDIDATE) {

            if (req.getElectId() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "electId is required for CANDIDATE option.");
            }

            // ✅ BEST UX: if row exists but inactive, restore it (prevents "ghost duplicate")
            Optional<ContestOption> existing =
                    optionRepo.findByContestIdAndElectId(req.getContestId(), req.getElectId());

            if (existing.isPresent()) {
                ContestOption ex = existing.get();

                if (Boolean.TRUE.equals(ex.isActive())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Candidate already assigned to this contest.");
                }

                // restore
                int nextOrder = (req.getOptionOrder() != null)
                        ? req.getOptionOrder()
                        : (optionRepo.maxOrder(req.getContestId()) + 1);
                if (nextOrder <= 0) nextOrder = 1;

                ex.setElectionId(contest.getElectionId()); // keep consistent with contest
                ex.setOptionType(ContestOptionType.CANDIDATE);
                ex.setOptionLabel(null);
                ex.setOptionOrder(nextOrder);
                ex.setActive(req.getIsActive() == null || req.getIsActive());

                ContestOption restored = optionRepo.save(ex);
                return contestOptionMapper.toDto(restored);
            }

            // create new
            ContestOption o = new ContestOption();
            o.setContestId(req.getContestId());
            o.setElectionId(contest.getElectionId()); // must match contest.electionId (trigger enforces)
            o.setOptionType(ContestOptionType.CANDIDATE);
            o.setElectId(req.getElectId());
            o.setOptionLabel(null);

            int nextOrder = (req.getOptionOrder() != null)
                    ? req.getOptionOrder()
                    : (optionRepo.maxOrder(req.getContestId()) + 1);
            if (nextOrder <= 0) nextOrder = 1;

            o.setOptionOrder(nextOrder);
            o.setActive(req.getIsActive() == null || req.getIsActive());

            ContestOption saved = optionRepo.save(o);
            return contestOptionMapper.toDto(saved);
        }

        // ===========================
        // LABEL OPTION
        // ===========================
        String label = (req.getOptionLabel() == null) ? null : req.getOptionLabel().trim();
        if (label == null || label.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "optionLabel is required for LABEL option.");
        }

        ContestOption o = new ContestOption();
        o.setContestId(req.getContestId());
        o.setElectionId(contest.getElectionId());
        o.setOptionType(ContestOptionType.LABEL);
        o.setElectId(null);
        o.setOptionLabel(label);

        int nextOrder = (req.getOptionOrder() != null)
                ? req.getOptionOrder()
                : (optionRepo.maxOrder(req.getContestId()) + 1);
        if (nextOrder <= 0) nextOrder = 1;

        o.setOptionOrder(nextOrder);
        o.setActive(req.getIsActive() == null || req.getIsActive());

        ContestOption saved = optionRepo.save(o);
        return contestOptionMapper.toDto(saved);
    }



    @Override
    public ContestOptionDto updateOption(UUID optionId, ContestOptionUpdateRequest req) {
        authz.requireNecAdminOrPlatformAdmin();

        ContestOption o = optionRepo.findById(optionId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Contest option not found"));

        Contest contest = contestRepo.findById(o.getContestId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Contest not found"));

        if (contest.getStatus() == ContestStatus.LOCKED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Contest is LOCKED. Options cannot be modified.");
        }

        // Don’t allow moving option across contests in production (reduces data corruption)
        if (req.getContestId() != null && !req.getContestId().equals(o.getContestId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot change contestId of an option.");
        }

        ContestOptionType newType = req.getOptionType() != null ? req.getOptionType() : o.getOptionType();

        // Apply type fields safely (align with DB checks)
        o.setOptionType(newType);

        if (newType == ContestOptionType.CANDIDATE) {
            if (req.getElectId() != null) {
                // duplicate guard (ignore if it's the same)
                if (!Objects.equals(req.getElectId(), o.getElectId())
                        && optionRepo.existsByContestIdAndElectId(o.getContestId(), req.getElectId())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Candidate already assigned to this contest.");
                }
                o.setElectId(req.getElectId());
            }
            o.setOptionLabel(null);
        } else {
            if (req.getOptionLabel() != null) {
                String label = req.getOptionLabel().trim();
                if (label.isEmpty()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "optionLabel cannot be blank.");
                }
                o.setOptionLabel(label);
            }
            o.setElectId(null);
        }

        if (req.getOptionOrder() != null) {
            if (req.getOptionOrder() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "optionOrder must be >= 1.");
            }
            o.setOptionOrder(req.getOptionOrder());
        }

        if (req.getIsActive() != null) {
            o.setActive(req.getIsActive());
        }

        ContestOption saved = optionRepo.save(o);
        return contestOptionMapper.toDto(saved);
    }


    @Override
    @Transactional(readOnly = true)
    public ContestOptionDto getOption(UUID optionId) {
        return optionRepo.findById(optionId)
                .map(contestOptionMapper::toDto)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Contest option not found"));
    }



    @Override
    @Transactional(readOnly = true)
    public List<ContestOptionDto> listByContest(UUID contestId, boolean onlyActive) {
        // ensure contest exists
        contestRepo.findById(contestId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Contest not found: " + contestId));
        List<ContestOption> items = onlyActive ? optionRepo.findByContestIdAndIsActiveTrueOrderByOptionOrderAsc(contestId)
                : optionRepo.findByContestIdOrderByOptionOrderAsc(contestId);
        return items.stream().map(contestOptionMapper::toDto).collect(Collectors.toList());
    }


    @Override
    @Transactional
    public void deleteOption(UUID optionId) {
        authz.requireNecAdminOrPlatformAdmin();

        ContestOption o = optionRepo.findById(optionId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Contest option not found"));

        Contest contest = contestRepo.findById(o.getContestId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Contest not found"));

        if (contest.getStatus() == ContestStatus.LOCKED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Contest is LOCKED. Options cannot be modified.");
        }

        UUID contestId = o.getContestId();

        optionRepo.deleteById(optionId);

        // ✅ renumber to remove gaps (1..N)
        optionRepo.resequenceOptionOrder(contestId);
    }


    @Override
    @Transactional(readOnly = true)
    public List<ContestOptionDto> findByCandidateId(UUID electId) {
        List<ContestOption> items = optionRepo.findByElectId(electId);
        return items.stream().map(contestOptionMapper::toDto).collect(Collectors.toList());
    }


    @Override
    public List<ContestOptionDto> bulkAssignCandidates(ContestCandidateBulkAssignRequest req) {

        authz.requireNecAdminOrPlatformAdmin();

        Contest contest = contestRepo.findById(req.getContestId())
                .orElseThrow(() ->
                        new ResponseStatusException(
                                NOT_FOUND,
                                "Contest not found"
                        )
                );

        if (contest.getStatus() == ContestStatus.LOCKED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Contest is LOCKED. Options cannot be modified."
            );
        }

        /*
         * ContestOption.election_id is NOT optional.
         *
         * Every option must belong to the same election as its contest.
         */
        UUID electionId = contest.getElectionId();

        if (electionId == null) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Contest is not associated with an election."
            );
        }


        // ------------------------------------------------------------
        // Clean incoming ElectionCandidate IDs
        // ------------------------------------------------------------

        List<UUID> incoming = req.getElectIds()
                .stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (incoming.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "electIds cannot be empty."
            );
        }


        // ------------------------------------------------------------
        // Get existing candidate options for this contest
        // ------------------------------------------------------------

        List<ContestOption> existingCandidateOptions =
                optionRepo.findByContestIdAndOptionType(
                        req.getContestId(),
                        ContestOptionType.CANDIDATE
                );


        Map<UUID, ContestOption> byElectId =
                existingCandidateOptions.stream()
                        .filter(o -> o.getElectId() != null)
                        .collect(
                                Collectors.toMap(
                                        ContestOption::getElectId,
                                        o -> o,
                                        (a, b) -> a
                                )
                        );


        // ------------------------------------------------------------
        // Determine next option order
        // ------------------------------------------------------------

        int order = optionRepo.maxOrder(req.getContestId());

        List<ContestOption> toSave = new ArrayList<>();


        // ------------------------------------------------------------
        // Add missing ElectionCandidates
        // ------------------------------------------------------------

        for (UUID electId : incoming) {

            ContestOption found = byElectId.get(electId);

            if (found != null) {

                /*
                 * Existing records should already have election_id,
                 * but repair it if an old row was created without one.
                 */
                if (found.getElectionId() == null) {
                    found.setElectionId(electionId);
                }

                if (!found.isActive()) {
                    found.setActive(true);
                    toSave.add(found);
                }

                continue;
            }


            ContestOption option = new ContestOption();

            option.setContestId(contest.getContestId());

            /*
             * IMPORTANT:
             * This was missing and caused:
             *
             * contest_option.election_id (<NULL>)
             * must match contest.election_id (...)
             */
            option.setElectionId(electionId);

            option.setOptionType(
                    ContestOptionType.CANDIDATE
            );

            /*
             * electId references:
             * election_candidate.elect_id
             */
            option.setElectId(electId);

            option.setOptionLabel(null);
            option.setActive(true);

            option.setOptionOrder(++order);

            toSave.add(option);
        }


        // ------------------------------------------------------------
        // Replace mode
        //
        // Deactivate candidate options that are no longer included.
        // ------------------------------------------------------------

        if (req.isReplace()) {

            Set<UUID> incomingSet =
                    new HashSet<>(incoming);

            for (ContestOption option :
                    existingCandidateOptions) {

                UUID electId =
                        option.getElectId();

                if (electId != null
                        && !incomingSet.contains(electId)
                        && option.isActive()) {

                    option.setActive(false);

                    /*
                     * Preserve/repair election ownership.
                     */
                    if (option.getElectionId() == null) {
                        option.setElectionId(electionId);
                    }

                    toSave.add(option);
                }
            }
        }


        // ------------------------------------------------------------
        // Persist
        // ------------------------------------------------------------

        if (!toSave.isEmpty()) {
            optionRepo.saveAll(toSave);
        }


        // ------------------------------------------------------------
        // Return refreshed ordered options for UI
        // ------------------------------------------------------------

        return optionRepo
                .findByContestIdOrderByOptionOrderAsc(
                        req.getContestId()
                )
                .stream()
                .map(contestOptionMapper::toDto)
                .collect(Collectors.toList());
    }



}
