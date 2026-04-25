package election.ems_backend.service.implement;

import election.ems_backend.dto.PollingCenterAllocationCreateRequest;
import election.ems_backend.dto.PollingCenterAllocationDto;
import election.ems_backend.dto.PollingCenterAllocationUpdateRequest;
import election.ems_backend.entity.Election;
import election.ems_backend.entity.PollingCenterAllocation;
import election.ems_backend.mapper.PollingCenterAllocationMapper;
import election.ems_backend.repository.*;
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
    private final PollingPlaceAllocationRepository placeAllocRepo; // ✅ add

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

        // ✅ UPDATED: validate using election policy (NEC spare %)
        validateNumbers(req.getRegisteredVoters(), req.getBallotsIssued(), election);

        var saved = repository.save(mapper.toEntity(req, election, center));
        return mapper.toDTO(saved);
    }


    @Override
    @Transactional
    public PollingCenterAllocationDto update(UUID id, PollingCenterAllocationUpdateRequest req) {
        var entity = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Allocation not found"));

        int rv = (req.getRegisteredVoters() != null)
                ? req.getRegisteredVoters()
                : entity.getRegisteredVoters();

        Integer bi = (req.getBallotsIssued() != null)
                ? req.getBallotsIssued()
                : entity.getBallotsIssued();

        // 1️⃣ Election policy (spare %, >= registered)
        validateNumbers(rv, bi, entity.getElection());

        // 2️⃣ ❗ Center cannot be reduced below existing place totals
        UUID electionId = entity.getElection().getElectionId();
        UUID centerId   = entity.getPollingCenter().getCenterId();

        long usedRv = placeAllocRepo.sumRegisteredVotersByElectionAndCenter(electionId, centerId);
        long usedBi = placeAllocRepo.sumBallotsIssuedByElectionAndCenter(electionId, centerId);

        if (usedRv > rv) {
            throw new ResponseStatusException(BAD_REQUEST,
                    "Center registeredVoters cannot be less than total allocated to places. " +
                            "placesTotal=" + usedRv + ", requestedCenter=" + rv);
        }

        if (bi == null) {
            throw new ResponseStatusException(BAD_REQUEST,
                    "Center ballotsIssued is required when polling place allocations already exist");
        }

        if (usedBi > bi) {
            throw new ResponseStatusException(BAD_REQUEST,
                    "Center ballotsIssued cannot be less than total allocated to places. " +
                            "placesTotal=" + usedBi + ", requestedCenter=" + bi);
        }

        // 3️⃣ Apply + save
        mapper.apply(req, entity);
        var saved = repository.save(entity);

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

    /**
     * ✅ Validate ballotsIssued using NEC election policy.
     *
     * Rules:
     * 1) registeredVoters >= 0
     * 2) ballotsIssued null => allowed (treated as "not set yet")
     * 3) ballotsIssued >= 0
     * 4) If election.enforceBallotsGteRegistered = true => ballotsIssued >= registeredVoters
     * 5) If election.ballotSparePercent != null => ballotsIssued <= registeredVoters + ceil(rv * sparePercent/100)
     */
    private void validateNumbers(int registeredVoters, Integer ballotsIssued, Election election) {
        if (registeredVoters < 0) {
            throw new ResponseStatusException(BAD_REQUEST, "registeredVoters cannot be negative");
        }

        // Allow "not assigned yet"
        if (ballotsIssued == null) return;

        if (ballotsIssued < 0) {
            throw new ResponseStatusException(BAD_REQUEST, "ballotsIssued cannot be negative");
        }

        boolean enforceGte = (election == null) || election.isEnforceBallotsGteRegistered();
        if (enforceGte && ballotsIssued < registeredVoters) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "ballotsIssued must be >= registeredVoters (NEC policy)"
            );
        }

        Integer sparePercent = (election == null) ? null : election.getBallotSparePercent();
        if (sparePercent == null) {
            // NEC hasn't configured spare cap yet => don't enforce upper limit here
            return;
        }

        if (sparePercent < 0 || sparePercent > 100) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid election ballotSparePercent: " + sparePercent);
        }

        int spare = (int) Math.ceil(registeredVoters * (sparePercent / 100.0));
        int maxAllowed = registeredVoters + spare;

        if (ballotsIssued > maxAllowed) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "ballotsIssued cannot exceed " + maxAllowed +
                            " (NEC spare cap " + sparePercent + "% for registeredVoters=" + registeredVoters + ")"
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