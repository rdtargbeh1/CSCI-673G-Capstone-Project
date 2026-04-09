package election.ems_backend.service.implement;

import election.ems_backend.dto.PollingCenterAllocationCreateRequest;
import election.ems_backend.dto.PollingCenterAllocationDto;
import election.ems_backend.dto.PollingCenterAllocationUpdateRequest;
import election.ems_backend.entity.PollingCenterAllocation;
import election.ems_backend.mapper.PollingCenterAllocationMapper;
import election.ems_backend.repository.ElectionRepository;
import election.ems_backend.repository.NECResultRepository;
import election.ems_backend.repository.PollingCenterAllocationRepository;
import election.ems_backend.repository.PollingCenterRepository;
import election.ems_backend.service.PollingCenterAllocationService;
import election.ems_backend.utility.PollingCenterAllocationSpecs;
import election.ems_backend.views.repo.NecResultGeoRepository;
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
public class PollingCenterAllocationServiceImplementation implements PollingCenterAllocationService {

    private final PollingCenterAllocationRepository repository;
    private final ElectionRepository electionRepo;
    private final PollingCenterRepository centerRepo;
    private final NECResultRepository resultRepo;
    private final NecResultGeoRepository geoRepo; // to keep projection in sync
    private final PollingCenterAllocationMapper mapper = new PollingCenterAllocationMapper();

    @Override
    @Transactional
    public PollingCenterAllocationDto create(PollingCenterAllocationCreateRequest req) {
        var election = electionRepo.findById(req.getElectionId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Election not found"));
        var center = centerRepo.findById(req.getCenterId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Polling center not found"));

        if (repository.existsByElection_ElectionIdAndPollingCenter_CenterId(election.getElectionId(), center.getCenterId())) {
            throw new ResponseStatusException(CONFLICT, "Allocation already exists for this election & center");
        }
        validateNumbers(req.getRegisteredVoters(), req.getBallotsIssued());

        var saved = repository.save(mapper.toEntity(req, election, center));
        return mapper.toDTO(saved);
    }

    @Override
    @Transactional
    public PollingCenterAllocationDto update(UUID id, PollingCenterAllocationUpdateRequest req) {
        var entity = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Allocation not found"));

        if (req.getRegisteredVoters() != null || req.getBallotsIssued() != null) {
            validateNumbers(
                    req.getRegisteredVoters() != null ? req.getRegisteredVoters() : entity.getRegisteredVoters(),
                    req.getBallotsIssued()           != null ? req.getBallotsIssued() : entity.getBallotsIssued()
            );
        }

        // apply & save
        mapper.apply(req, entity);
        var saved = repository.save(entity);

        // 🔄 Sync any existing NEC results for this (election, center)
        syncNecResultsForAllocation(saved);

        return mapper.toDTO(saved);
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        var entity = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Allocation not found"));

        // Optional: protect if results exist
        boolean hasResults = !resultRepo
                .findByElection_ElectionIdAndPollingCenter_CenterId(
                        entity.getElection().getElectionId(),
                        entity.getPollingCenter().getCenterId())
                .isEmpty();
        if (hasResults) {
            throw new ResponseStatusException(CONFLICT, "Cannot delete allocation: results exist for this center & election");
        }
        repository.delete(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public PollingCenterAllocationDto get(UUID id) {
        return repository.findById(id).map(mapper::toDTO)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Allocation not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PollingCenterAllocationDto> search(UUID electionId, UUID countyId, UUID districtId, UUID centerId, Pageable pageable) {
        Specification<PollingCenterAllocation> spec = Specification
                .where(PollingCenterAllocationSpecs.electionEquals(electionId))
                .and(PollingCenterAllocationSpecs.countyEquals(countyId))
                .and(PollingCenterAllocationSpecs.districtEquals(districtId))
                .and(PollingCenterAllocationSpecs.centerEquals(centerId));
        return repository.findAll(spec, pageable).map(mapper::toDTO);
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



    /** When allocation changes, reflect into existing NECResult + nec_result_geo snapshot. */
    @Transactional
    private void syncNecResultsForAllocation(PollingCenterAllocation a) {
        UUID electionId = a.getElection().getElectionId();
        UUID centerId   = a.getPollingCenter().getCenterId(); // use getPollingCenterId() if that's your field

        resultRepo.findByElection_ElectionIdAndPollingCenter_CenterId(electionId, centerId)
                .ifPresent(r -> {
                    // update NECResult
                    r.setTotalRegisteredVoters(a.getRegisteredVoters());
                    resultRepo.save(r);

                });
    }

}