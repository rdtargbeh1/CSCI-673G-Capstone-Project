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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.NOT_FOUND;


/**
 * ContestOption service.
 *
 * Candidate ordering:
 *
 * Candidate-based contest options are returned alphabetically by the
 * Candidate.fullName field.
 *
 * The database option_order value is preserved because it is still useful for:
 *
 * - LABEL options
 * - explicit ordering semantics
 * - existing database constraints
 * - future manual ballot ordering
 *
 * Alphabetical candidate ordering is therefore a READ concern rather than
 * rewriting persistent option_order every time a candidate is attached.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ContestOptionServiceImpl
        implements ContestOptionService {


    private final ContestOptionRepository optionRepo;

    private final ContestRepository contestRepo;

    private final AuthorizationService authz;


    private final ContestOptionMapper contestOptionMapper =
            new ContestOptionMapper();


    // ========================================================================
    // CREATE
    // ========================================================================

    @Override
    @Transactional
    public ContestOptionDto createOption(
            ContestOptionCreateRequest req
    ) {

        authz.requireNecAdminOrPlatformAdmin();


        if (req == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Request body is required"
            );
        }


        if (req.getContestId() == null) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "contestId is required"
            );
        }


        Contest contest =
                contestRepo
                        .findById(
                                req.getContestId()
                        )
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                NOT_FOUND,
                                                "Contest not found"
                                        )
                        );


        if (
                contest.getStatus() ==
                        ContestStatus.LOCKED
        ) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Contest is LOCKED. Options cannot be modified."
            );
        }


        ContestOptionType type =
                req.getOptionType() == null
                        ? ContestOptionType.CANDIDATE
                        : req.getOptionType();


        // ====================================================================
        // CANDIDATE OPTION
        // ====================================================================

        if (
                type ==
                        ContestOptionType.CANDIDATE
        ) {

            if (
                    req.getElectId() ==
                            null
            ) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "electId is required for CANDIDATE option."
                );
            }


            Optional<ContestOption> existing =
                    optionRepo
                            .findByContestIdAndElectId(
                                    req.getContestId(),
                                    req.getElectId()
                            );


            // =================================================================
            // RESTORE EXISTING INACTIVE OPTION
            // =================================================================

            if (
                    existing.isPresent()
            ) {

                ContestOption ex =
                        existing.get();


                if (
                        ex.isActive()
                ) {

                    throw new ResponseStatusException(
                            HttpStatus.CONFLICT,
                            "Candidate already assigned to this contest."
                    );
                }


                int nextOrder =
                        req.getOptionOrder() != null
                                ? req.getOptionOrder()
                                : optionRepo.maxOrder(
                                req.getContestId()
                        ) + 1;


                if (
                        nextOrder <=
                                0
                ) {

                    nextOrder =
                            1;
                }


                ex.setElectionId(
                        contest.getElectionId()
                );


                ex.setOptionType(
                        ContestOptionType.CANDIDATE
                );


                ex.setOptionLabel(
                        null
                );


                ex.setOptionOrder(
                        nextOrder
                );


                ex.setActive(
                        req.getIsActive() == null ||
                                req.getIsActive()
                );


                ContestOption restored =
                        optionRepo.save(
                                ex
                        );


                return contestOptionMapper.toDto(
                        restored
                );
            }


            // =================================================================
            // CREATE NEW CANDIDATE OPTION
            // =================================================================

            ContestOption option =
                    new ContestOption();


            option.setContestId(
                    req.getContestId()
            );


            option.setElectionId(
                    contest.getElectionId()
            );


            option.setOptionType(
                    ContestOptionType.CANDIDATE
            );


            option.setElectId(
                    req.getElectId()
            );


            option.setOptionLabel(
                    null
            );


            int nextOrder =
                    req.getOptionOrder() != null
                            ? req.getOptionOrder()
                            : optionRepo.maxOrder(
                            req.getContestId()
                    ) + 1;


            if (
                    nextOrder <=
                            0
            ) {

                nextOrder =
                        1;
            }


            option.setOptionOrder(
                    nextOrder
            );


            option.setActive(
                    req.getIsActive() == null ||
                            req.getIsActive()
            );


            ContestOption saved =
                    optionRepo.save(
                            option
                    );


            return contestOptionMapper.toDto(
                    saved
            );
        }


        // ====================================================================
        // LABEL OPTION
        // ====================================================================

        String label =
                req.getOptionLabel() ==
                        null
                        ? null
                        : req.getOptionLabel()
                        .trim();


        if (
                label == null ||
                        label.isEmpty()
        ) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "optionLabel is required for LABEL option."
            );
        }


        ContestOption option =
                new ContestOption();


        option.setContestId(
                req.getContestId()
        );


        option.setElectionId(
                contest.getElectionId()
        );


        option.setOptionType(
                ContestOptionType.LABEL
        );


        option.setElectId(
                null
        );


        option.setOptionLabel(
                label
        );


        int nextOrder =
                req.getOptionOrder() != null
                        ? req.getOptionOrder()
                        : optionRepo.maxOrder(
                        req.getContestId()
                ) + 1;


        if (
                nextOrder <=
                        0
        ) {

            nextOrder =
                    1;
        }


        option.setOptionOrder(
                nextOrder
        );


        option.setActive(
                req.getIsActive() == null ||
                        req.getIsActive()
        );


        ContestOption saved =
                optionRepo.save(
                        option
                );


        return contestOptionMapper.toDto(
                saved
        );
    }


    // ========================================================================
    // UPDATE
    // ========================================================================

    @Override
    public ContestOptionDto updateOption(
            UUID optionId,
            ContestOptionUpdateRequest req
    ) {

        authz.requireNecAdminOrPlatformAdmin();


        ContestOption option =
                optionRepo
                        .findById(
                                optionId
                        )
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                NOT_FOUND,
                                                "Contest option not found"
                                        )
                        );


        Contest contest =
                contestRepo
                        .findById(
                                option.getContestId()
                        )
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                NOT_FOUND,
                                                "Contest not found"
                                        )
                        );


        if (
                contest.getStatus() ==
                        ContestStatus.LOCKED
        ) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Contest is LOCKED. Options cannot be modified."
            );
        }


        // ====================================================================
        // CONTEST OWNERSHIP CANNOT CHANGE
        // ====================================================================

        if (
                req.getContestId() != null &&
                        !req.getContestId()
                                .equals(
                                        option.getContestId()
                                )
        ) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cannot change contestId of an option."
            );
        }


        ContestOptionType newType =
                req.getOptionType() != null
                        ? req.getOptionType()
                        : option.getOptionType();


        option.setOptionType(
                newType
        );


        // ====================================================================
        // CANDIDATE
        // ====================================================================

        if (
                newType ==
                        ContestOptionType.CANDIDATE
        ) {

            if (
                    req.getElectId() !=
                            null
            ) {

                if (
                        !Objects.equals(
                                req.getElectId(),
                                option.getElectId()
                        ) &&
                                optionRepo
                                        .existsByContestIdAndElectId(
                                                option.getContestId(),
                                                req.getElectId()
                                        )
                ) {

                    throw new ResponseStatusException(
                            HttpStatus.CONFLICT,
                            "Candidate already assigned to this contest."
                    );
                }


                option.setElectId(
                        req.getElectId()
                );
            }


            option.setOptionLabel(
                    null
            );
        }


        // ====================================================================
        // LABEL
        // ====================================================================

        else {

            if (
                    req.getOptionLabel() !=
                            null
            ) {

                String label =
                        req.getOptionLabel()
                                .trim();


                if (
                        label.isEmpty()
                ) {

                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "optionLabel cannot be blank."
                    );
                }


                option.setOptionLabel(
                        label
                );
            }


            option.setElectId(
                    null
            );
        }


        // ====================================================================
        // EXPLICIT OPTION ORDER
        // ====================================================================

        if (
                req.getOptionOrder() !=
                        null
        ) {

            if (
                    req.getOptionOrder() <=
                            0
            ) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "optionOrder must be >= 1."
                );
            }


            option.setOptionOrder(
                    req.getOptionOrder()
            );
        }


        // ====================================================================
        // ACTIVE
        // ====================================================================

        if (
                req.getIsActive() !=
                        null
        ) {

            option.setActive(
                    req.getIsActive()
            );
        }


        ContestOption saved =
                optionRepo.save(
                        option
                );


        return contestOptionMapper.toDto(
                saved
        );
    }


    // ========================================================================
    // GET ONE
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public ContestOptionDto getOption(
            UUID optionId
    ) {

        return optionRepo
                .findById(
                        optionId
                )
                .map(
                        contestOptionMapper::toDto
                )
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        NOT_FOUND,
                                        "Contest option not found"
                                )
                );
    }


    // ========================================================================
    // LIST BY CONTEST
    //
    // Candidate options are now returned alphabetically.
    //
    // LABEL options continue to follow option_order.
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<ContestOptionDto> listByContest(
            UUID contestId,
            boolean onlyActive
    ) {

        contestRepo
                .findById(
                        contestId
                )
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        NOT_FOUND,
                                        "Contest not found: " +
                                                contestId
                                )
                );


        List<ContestOption> items =
                onlyActive
                        ? optionRepo
                        .findActiveByContestIdAlphabetically(
                                contestId
                        )
                        : optionRepo
                        .findByContestIdAlphabetically(
                                contestId
                        );


        return items
                .stream()
                .map(
                        contestOptionMapper::toDto
                )
                .collect(
                        Collectors.toList()
                );
    }


    // ========================================================================
    // DELETE
    // ========================================================================

    @Override
    @Transactional
    public void deleteOption(
            UUID optionId
    ) {

        authz.requireNecAdminOrPlatformAdmin();


        ContestOption option =
                optionRepo
                        .findById(
                                optionId
                        )
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                NOT_FOUND,
                                                "Contest option not found"
                                        )
                        );


        Contest contest =
                contestRepo
                        .findById(
                                option.getContestId()
                        )
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                NOT_FOUND,
                                                "Contest not found"
                                        )
                        );


        if (
                contest.getStatus() ==
                        ContestStatus.LOCKED
        ) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Contest is LOCKED. Options cannot be modified."
            );
        }


        UUID contestId =
                option.getContestId();


        optionRepo.deleteById(
                optionId
        );


        /*
         * Preserve existing option_order cleanup.
         *
         * Alphabetical candidate display does not depend on this value,
         * but keeping contiguous values preserves the existing backend
         * behavior.
         */
        optionRepo.resequenceOptionOrder(
                contestId
        );
    }


    // ========================================================================
    // FIND BY ELECTION CANDIDATE
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<ContestOptionDto> findByCandidateId(
            UUID electId
    ) {

        List<ContestOption> items =
                optionRepo.findByElectId(
                        electId
                );


        return items
                .stream()
                .map(
                        contestOptionMapper::toDto
                )
                .collect(
                        Collectors.toList()
                );
    }


    // ========================================================================
    // BULK ASSIGN CANDIDATES
    // ========================================================================

    @Override
    @Transactional
    public List<ContestOptionDto> bulkAssignCandidates(
            ContestCandidateBulkAssignRequest req
    ) {

        authz.requireNecAdminOrPlatformAdmin();


        if (
                req == null
        ) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Request body is required"
            );
        }


        if (
                req.getContestId() ==
                        null
        ) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "contestId is required"
            );
        }


        Contest contest =
                contestRepo
                        .findById(
                                req.getContestId()
                        )
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                NOT_FOUND,
                                                "Contest not found"
                                        )
                        );


        if (
                contest.getStatus() ==
                        ContestStatus.LOCKED
        ) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Contest is LOCKED. Options cannot be modified."
            );
        }


        // ====================================================================
        // ELECTION OWNERSHIP
        // ====================================================================

        UUID electionId =
                contest.getElectionId();


        if (
                electionId ==
                        null
        ) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Contest is not associated with an election."
            );
        }


        // ====================================================================
        // CLEAN INCOMING ELECTION CANDIDATE IDS
        // ====================================================================

        if (
                req.getElectIds() ==
                        null
        ) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "electIds cannot be null."
            );
        }


        List<UUID> incoming =
                req.getElectIds()
                        .stream()
                        .filter(
                                Objects::nonNull
                        )
                        .distinct()
                        .toList();


        if (
                incoming.isEmpty()
        ) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "electIds cannot be empty."
            );
        }


        // ====================================================================
        // EXISTING CANDIDATE OPTIONS
        // ====================================================================

        List<ContestOption> existingCandidateOptions =
                optionRepo
                        .findByContestIdAndOptionType(
                                req.getContestId(),
                                ContestOptionType.CANDIDATE
                        );


        Map<UUID, ContestOption> byElectId =
                existingCandidateOptions
                        .stream()
                        .filter(
                                option ->
                                        option.getElectId() !=
                                                null
                        )
                        .collect(
                                Collectors.toMap(
                                        ContestOption::getElectId,
                                        option ->
                                                option,
                                        (
                                                first,
                                                second
                                        ) ->
                                                first,
                                        HashMap::new
                                )
                        );


        // ====================================================================
        // NEXT EXPLICIT OPTION ORDER
        // ====================================================================

        int order =
                optionRepo.maxOrder(
                        req.getContestId()
                );


        List<ContestOption> toSave =
                new ArrayList<>();


        // ====================================================================
        // ADD / REACTIVATE CANDIDATES
        // ====================================================================

        for (
                UUID electId :
                incoming
        ) {

            ContestOption found =
                    byElectId.get(
                            electId
                    );


            // =================================================================
            // EXISTING
            // =================================================================

            if (
                    found != null
            ) {

                /*
                 * Repair old records that may pre-date election_id ownership.
                 */
                if (
                        found.getElectionId() ==
                                null
                ) {

                    found.setElectionId(
                            electionId
                    );
                }


                if (
                        !found.isActive()
                ) {

                    found.setActive(
                            true
                    );


                    toSave.add(
                            found
                    );
                }


                continue;
            }


            // =================================================================
            // NEW
            // =================================================================

            ContestOption option =
                    new ContestOption();


            option.setContestId(
                    contest.getContestId()
            );


            option.setElectionId(
                    electionId
            );


            option.setOptionType(
                    ContestOptionType.CANDIDATE
            );


            /*
             * electId references ElectionCandidate.elect_id.
             */
            option.setElectId(
                    electId
            );


            option.setOptionLabel(
                    null
            );


            option.setActive(
                    true
            );


            /*
             * Keep the persistent explicit order.
             *
             * Candidate DISPLAY ordering is alphabetical at read time.
             */
            option.setOptionOrder(
                    ++order
            );


            toSave.add(
                    option
            );
        }


        // ====================================================================
        // REPLACE MODE
        //
        // Candidates absent from the incoming collection are deactivated.
        // ====================================================================

        if (
                req.isReplace()
        ) {

            Set<UUID> incomingSet =
                    new HashSet<>(
                            incoming
                    );


            for (
                    ContestOption option :
                    existingCandidateOptions
            ) {

                UUID electId =
                        option.getElectId();


                if (
                        electId != null &&
                                !incomingSet.contains(
                                        electId
                                ) &&
                                option.isActive()
                ) {

                    option.setActive(
                            false
                    );


                    if (
                            option.getElectionId() ==
                                    null
                    ) {

                        option.setElectionId(
                                electionId
                        );
                    }


                    toSave.add(
                            option
                    );
                }
            }
        }


        // ====================================================================
        // SAVE
        // ====================================================================

        if (
                !toSave.isEmpty()
        ) {

            optionRepo.saveAll(
                    toSave
            );
        }


        /*
         * Flush before the refreshed native query.
         *
         * This guarantees the alphabetical query sees every new/reactivated
         * candidate added in this transaction.
         */
        optionRepo.flush();


        // ====================================================================
        // RETURN ALPHABETICALLY
        // ====================================================================

        return optionRepo
                .findByContestIdAlphabetically(
                        req.getContestId()
                )
                .stream()
                .map(
                        contestOptionMapper::toDto
                )
                .collect(
                        Collectors.toList()
                );
    }
}