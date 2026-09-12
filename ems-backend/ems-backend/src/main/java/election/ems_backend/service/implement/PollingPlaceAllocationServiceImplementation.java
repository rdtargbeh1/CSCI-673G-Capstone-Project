package election.ems_backend.service.implement;

import election.ems_backend.dto.PollingPlaceAllocationCreateRequest;
import election.ems_backend.dto.PollingPlaceAllocationDto;
import election.ems_backend.dto.PollingPlaceAllocationUpdateRequest;
import election.ems_backend.entity.Election;
import election.ems_backend.entity.PollingCenterAllocation;
import election.ems_backend.entity.PollingPlaceAllocation;
import election.ems_backend.mapper.PollingPlaceAllocationMapper;
import election.ems_backend.repository.ElectionRepository;
import election.ems_backend.repository.PollingCenterAllocationRepository;
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
    private final PollingCenterAllocationRepository centerAllocRepo;

    private final PollingPlaceAllocationMapper mapper ;


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

        // ✅ Existing: validate using election policy (NEC spare %)
        validateNumbers(req.getRegisteredVoters(), req.getBallotsIssued(), election);

        // ✅ NEW: enforce center caps
        UUID centerId = place.getPollingCenter().getCenterId();
        enforceCenterCapsOnCreate(
                election.getElectionId(),
                centerId,
                req.getRegisteredVoters(),
                req.getBallotsIssued()
        );

        var saved = repo.save(mapper.toEntity(req, election, place));
        return mapper.toDTO(saved);
    }

    @Override
    @Transactional
    public PollingPlaceAllocationDto update(UUID id, PollingPlaceAllocationUpdateRequest req) {
        var entity = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Allocation not found"));

        int rv = (req.getRegisteredVoters() != null) ? req.getRegisteredVoters() : entity.getRegisteredVoters();
        Integer bi = (req.getBallotsIssued() != null) ? req.getBallotsIssued() : entity.getBallotsIssued();

        // ✅ Existing: validate using election policy (NEC spare %)
        validateNumbers(rv, bi, entity.getElection());

        // ✅ NEW: enforce center caps (exclude this allocation from sums)
        UUID electionId = entity.getElection().getElectionId();
        UUID centerId = entity.getPollingPlace().getPollingCenter().getCenterId();

        enforceCenterCapsOnUpdate(
                entity.getPlaceAllocationId(),
                electionId,
                centerId,
                rv,
                bi
        );

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

    /**
     * ✅ Validate ballotsIssued using NEC election policy.
     */
    private void validateNumbers(int registeredVoters, Integer ballotsIssued, Election election) {
        if (registeredVoters < 0) {
            throw new ResponseStatusException(BAD_REQUEST, "registeredVoters cannot be negative");
        }
        if (ballotsIssued == null) return;
        if (ballotsIssued < 0) {
            throw new ResponseStatusException(BAD_REQUEST, "ballotsIssued cannot be negative");
        }

        boolean enforceGte = (election == null) || election.isEnforceBallotsGteRegistered();
        if (enforceGte && ballotsIssued < registeredVoters) {
            throw new ResponseStatusException(BAD_REQUEST, "ballotsIssued must be >= registeredVoters (NEC policy)");
        }

        Integer sparePercent = (election == null) ? null : election.getBallotSparePercent();
        if (sparePercent == null) return;

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

    // ===================== Center cap enforcement =====================

    private void enforceCenterCapsOnCreate(
            UUID electionId,
            UUID centerId,
            int newRv,
            Integer newBi
    ) {
        PollingCenterAllocation centerAlloc = centerAllocRepo.findForUpdate(electionId, centerId)
                .orElseThrow(() -> new ResponseStatusException(
                        BAD_REQUEST,
                        "Center allocation is required before allocating polling places " +
                                "(election=" + electionId + ", center=" + centerId + ")"
                ));

        long usedRv = repo.sumRegisteredVotersByElectionAndCenter(electionId, centerId);
        long usedBi = repo.sumBallotsIssuedByElectionAndCenter(electionId, centerId);

        long capRv = centerAlloc.getRegisteredVoters();
        long capBi = centerAlloc.getBallotsIssued() == null ? 0 : centerAlloc.getBallotsIssued();

        long addBi = (newBi == null ? 0 : newBi);

        long remainingRv = capRv - usedRv;   // ✅ expected remaining BEFORE this request
        long remainingBi = capBi - usedBi;   // ✅ expected remaining BEFORE this request

        long wouldBeRv = usedRv + newRv;
        long wouldBeBi = usedBi + addBi;

        if (newRv > remainingRv) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Place registeredVoters exceed remaining center capacity. " +
                            "cap=" + capRv +
                            ", used=" + usedRv +
                            ", remaining=" + remainingRv +
                            ", you entered=" + newRv +
                            ", wouldBe=" + wouldBeRv
            );
        }

        if (addBi > remainingBi) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Place ballotsIssued exceed remaining center capacity. " +
                            "cap=" + capBi +
                            ", used=" + usedBi +
                            ", remaining=" + remainingBi +
                            ", you entered=" + addBi +
                            ", wouldBe=" + wouldBeBi
            );
        }
    }



    private void enforceCenterCapsOnUpdate(
            UUID allocId,
            UUID electionId,
            UUID centerId,
            int rv,
            Integer bi
    ) {
        PollingCenterAllocation centerAlloc = centerAllocRepo.findForUpdate(electionId, centerId)
                .orElseThrow(() -> new ResponseStatusException(
                        BAD_REQUEST,
                        "Center allocation is required before allocating polling places " +
                                "(election=" + electionId + ", center=" + centerId + ")"
                ));

        // ✅ "used" excluding THIS allocation (so remaining is correct for update)
        long usedRv = repo.sumRegisteredVotersByElectionAndCenterExcluding(electionId, centerId, allocId);
        long usedBi = repo.sumBallotsIssuedByElectionAndCenterExcluding(electionId, centerId, allocId);

        long capRv = centerAlloc.getRegisteredVoters();
        long capBi = centerAlloc.getBallotsIssued() == null ? 0 : centerAlloc.getBallotsIssued();

        long addBi = (bi == null ? 0 : bi);

        // ✅ expected remaining BEFORE applying this updated allocation
        long remainingRv = capRv - usedRv;
        long remainingBi = capBi - usedBi;

        long wouldBeRv = usedRv + rv;
        long wouldBeBi = usedBi + addBi;

        // ✅ Compare request against remaining (best UX)
        if (rv > remainingRv) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Updated place registeredVoters exceed remaining center capacity. " +
                            "cap=" + capRv +
                            ", used(exclThis)=" + usedRv +
                            ", remaining=" + remainingRv +
                            ", you entered=" + rv +
                            ", wouldBe=" + wouldBeRv
            );
        }

        if (addBi > remainingBi) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Updated place ballotsIssued exceed remaining center capacity. " +
                            "cap=" + capBi +
                            ", used(exclThis)=" + usedBi +
                            ", remaining=" + remainingBi +
                            ", you entered=" + addBi +
                            ", wouldBe=" + wouldBeBi
            );
        }
    }


}
