package election.ems_backend.service.implement;

import election.ems_backend.dto.PollingPlaceAllocationCreateRequest;
import election.ems_backend.dto.PollingPlaceAllocationDto;
import election.ems_backend.dto.PollingPlaceAllocationUpdateRequest;
import election.ems_backend.entity.PollingPlaceAllocation;
import election.ems_backend.mapper.PollingPlaceAllocationMapper;
import election.ems_backend.repository.ElectionRepository;
import election.ems_backend.repository.PollingPlaceAllocationRepository;
import election.ems_backend.repository.PollingPlaceRepository;
import election.ems_backend.service.PollingPlaceAllocationService;
import election.ems_backend.utility.PollingPlaceAllocationSpecs;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.springframework.http.HttpStatus.*;
import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Service
@RequiredArgsConstructor
public class PollingPlaceAllocationServiceImplementation implements PollingPlaceAllocationService {

    private final PollingPlaceAllocationRepository repo;
    private final ElectionRepository electionRepo;
    private final PollingPlaceRepository placeRepo;
    private final PollingPlaceAllocationMapper mapper = new PollingPlaceAllocationMapper();

    @Override
    @Transactional
    public PollingPlaceAllocationDto create(PollingPlaceAllocationCreateRequest req) {
        var election = electionRepo.findById(req.getElectionId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Election not found"));
        var place = placeRepo.findById(req.getPlaceId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Polling place not found"));

        if (repo.existsByElection_ElectionIdAndPollingPlace_PlaceId(election.getElectionId(), place.getPlaceId())) {
            throw new ResponseStatusException(CONFLICT, "Allocation already exists for this election & polling place");
        }

        validateNumbers(req.getRegisteredVoters(), req.getBallotsIssued());

        var saved = repo.save(mapper.toEntity(req, election, place));
        return mapper.toDTO(saved);
    }

    @Override
    @Transactional
    public PollingPlaceAllocationDto update(UUID id, PollingPlaceAllocationUpdateRequest req) {
        var entity = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Allocation not found"));

        if (req.getRegisteredVoters() != null || req.getBallotsIssued() != null) {
            int rv = req.getRegisteredVoters() != null ? req.getRegisteredVoters() : entity.getRegisteredVoters();
            Integer bi = req.getBallotsIssued() != null ? req.getBallotsIssued() : entity.getBallotsIssued();
            validateNumbers(rv, bi);
        }

        mapper.apply(req, entity);
        var saved = repo.save(entity);
        return mapper.toDTO(saved);
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        var entity = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Allocation not found"));
        repo.delete(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public PollingPlaceAllocationDto get(UUID id) {
        return repo.findById(id)
                .map(mapper::toDTO)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Allocation not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PollingPlaceAllocationDto> search(UUID electionId, UUID centerId, UUID placeId, Pageable pageable) {
        Specification<PollingPlaceAllocation> spec = Specification
                .where(PollingPlaceAllocationSpecs.electionEquals(electionId))
                .and(PollingPlaceAllocationSpecs.centerEquals(centerId))
                .and(PollingPlaceAllocationSpecs.placeEquals(placeId));
        return repo.findAll(spec, pageable).map(mapper::toDTO);
    }

    /** Validate Ballots Issued **/
    private void validateNumbers(int registeredVoters, Integer ballotsIssued) {
        // 1) Basic sanity checks
        if (registeredVoters < 0) {
            throw new ResponseStatusException(BAD_REQUEST, "registeredVoters cannot be negative");
        }
        // Allow "no ballots assigned yet" if null
        if (ballotsIssued == null) {
            return;
        }
        if (ballotsIssued < 0) {
            throw new ResponseStatusException(BAD_REQUEST, "ballotsIssued cannot be negative");
        }
        // 2) Real-world rule: ballotsIssued should normally be >= registeredVoters
        if (ballotsIssued < registeredVoters) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "ballotsIssued should be greater than or equal to registeredVoters to avoid ballot shortage"
            );
        }
        // 3) Anti-fraud / sanity upper bound: max 20% spare ballots
        //    maxAllowed = registeredVoters + ceil(20% of registeredVoters)
        int spare = (int) Math.ceil(registeredVoters * 0.20);
        int maxAllowed = registeredVoters + spare;

        if (ballotsIssued > maxAllowed) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "ballotsIssued cannot exceed " + maxAllowed +
                            " (20% spare ballot cap for registeredVoters=" + registeredVoters + ")"
            );
        }
    }


}
