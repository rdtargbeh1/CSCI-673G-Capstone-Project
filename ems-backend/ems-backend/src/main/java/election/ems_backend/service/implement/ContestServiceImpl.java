package election.ems_backend.service.implement;

import election.ems_backend.dto.ContestCreateRequest;
import election.ems_backend.dto.ContestDto;
import election.ems_backend.dto.ContestUpdateRequest;
import election.ems_backend.entity.Contest;
import election.ems_backend.enums.ContestCategory;
import election.ems_backend.enums.ContestScopeType;
import election.ems_backend.enums.ContestStatus;
import election.ems_backend.enums.ContestVoteMethod;
import election.ems_backend.mapper.ContestMapper;
import election.ems_backend.repository.ContestOptionRepository;
import election.ems_backend.repository.ContestRepository;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.service.ContestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
@Transactional
public class ContestServiceImpl implements ContestService {

    private final ContestRepository contestRepo;
    private final ContestOptionRepository contestOptionRepository;
    private final AuthorizationService authz;
    private final ContestMapper contestMapper = new ContestMapper();


    @Override
    public ContestDto create(ContestCreateRequest req) {
        authz.requireNecAdminOrPlatformAdmin();

        Contest c = contestMapper.toEntity(req);

        // ✅ renamed method
        normalizeCandidateVotesToOptionId(c);

        Contest saved = contestRepo.save(c);
        return contestMapper.toDTO(saved);
    }


    @Override
    public ContestDto update(UUID contestId, ContestUpdateRequest req) {
        authz.requireNecAdminOrPlatformAdmin();

        Contest c = contestRepo.findById(contestId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Contest not found"));

        // LOCK protection stays unchanged
        if (c.getStatus() == ContestStatus.LOCKED) {
            if (req.getElectionId() != null
                    || req.getCategory() != null
                    || req.getScopeType() != null
                    || req.getCountyId() != null
                    || req.getDistrictId() != null
                    || req.getVoteMethod() != null
                    || req.getSeats() != null
                    || req.getMaxSelections() != null) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Contest is LOCKED. Structural fields cannot be modified.");
            }
        }

        if (req.getElectionId() != null && c.getStatus() != ContestStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot change electionId unless contest is DRAFT.");
        }

        contestMapper.apply(req, c);

        // ✅ renamed method
        normalizeCandidateVotesToOptionId(c);

        Contest saved = contestRepo.save(c);
        return contestMapper.toDTO(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ContestDto getContest(UUID contestId) {
        return contestRepo.findById(contestId)
                .map(contestMapper::toDTO)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Contest not found"));
    }


    @Override
    @Transactional(readOnly = true)
    public List<ContestDto> listByElection(UUID electionId) {
        return contestRepo.findByElectionId(electionId)
                .stream()
                .map(contestMapper::toDTO)
                .collect(Collectors.toList());
    }


    @Override
    public void deleteContest(UUID contestId) {
        authz.requireNecAdminOrPlatformAdmin();
        if (!contestRepo.existsById(contestId)) {
            throw new ResponseStatusException(NOT_FOUND, "Contest not found");
        }
        contestRepo.deleteById(contestId);
    }

    /**
     * Normalizes and validates Contest configuration so that
     * vote submissions can be safely aggregated via contest_option.option_id.
     *
     * This does NOT create options — it only enforces correctness
     * before options & submissions rely on the contest definition.
     */
    private void normalizeCandidateVotesToOptionId(Contest c) {

        if (c == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Contest body is required.");
        }

        if (c.getElectionId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "electionId is required.");
        }

        if (c.getContestName() == null || c.getContestName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "contestName is required.");
        }
        c.setContestName(c.getContestName().trim());

        // defaults (mirror DB + entity PrePersist)
        if (c.getCategory() == null) c.setCategory(ContestCategory.OTHER);
        if (c.getScopeType() == null) c.setScopeType(ContestScopeType.NATIONAL);
        if (c.getVoteMethod() == null) c.setVoteMethod(ContestVoteMethod.SINGLE_CHOICE);
        if (c.getStatus() == null) c.setStatus(ContestStatus.DRAFT);

        if (c.getSeats() <= 0) c.setSeats(1);
        if (c.getMaxSelections() <= 0) c.setMaxSelections(1);
        if (c.getMaxSelections() < c.getSeats()) {
            c.setMaxSelections(c.getSeats());
        }

        // scope integrity (must match DB constraint)
        if (c.getScopeType() == ContestScopeType.NATIONAL) {
            c.setCountyId(null);
            c.setDistrictId(null);
        }
        else if (c.getScopeType() == ContestScopeType.COUNTY) {
            if (c.getCountyId() == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "countyId is required for COUNTY scope."
                );
            }
            c.setDistrictId(null);
        }
        else if (c.getScopeType() == ContestScopeType.DISTRICT) {
            if (c.getDistrictId() == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "districtId is required for DISTRICT scope."
                );
            }
            // countyId may be inferred from district — leave as-is
        }

        // sanity guards (optional but safe)
        if (c.getSeats() > 99) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "seats is too large.");
        }
        if (c.getMaxSelections() > 99) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "maxSelections is too large.");
        }
    }


}