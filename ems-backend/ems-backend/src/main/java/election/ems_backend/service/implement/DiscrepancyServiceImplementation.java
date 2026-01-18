package election.ems_backend.service.implement;

import election.ems_backend.dto.DiscrepancyDto;
import election.ems_backend.dto.DiscrepancySearchRequest;
import election.ems_backend.entity.Discrepancy;
import election.ems_backend.entity.Election;
import election.ems_backend.entity.Organization;
import election.ems_backend.entity.PollingCenter;
import election.ems_backend.enums.DiscrepancyStatus;
import election.ems_backend.mapper.DiscrepancyMapper;
import election.ems_backend.repository.*;
import election.ems_backend.service.DiscrepancyService;
import election.ems_backend.utility.DiscrepancySpecs;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class DiscrepancyServiceImplementation implements DiscrepancyService {

    private final DiscrepancyRepository repo;
    private final DiscrepancyReconcileRepository reconcileRepo;
    private final ElectionRepository electionRepo;
    private final PollingCenterRepository centerRepo;
    private final OrganizationRepository orgRepo;

    private final DiscrepancyMapper mapper = new DiscrepancyMapper();

    @Override
    @Transactional(readOnly = true)
    public Page<DiscrepancyDto> search(DiscrepancySearchRequest req, Pageable pageable) {
        Specification<Discrepancy> spec = Specification
                .where(DiscrepancySpecs.electionEquals(req.electionId()))
                .and(DiscrepancySpecs.countyEquals(req.countyId()))
                .and(DiscrepancySpecs.districtEquals(req.districtId()))
                .and(DiscrepancySpecs.centerEquals(req.centerId()))
                .and(DiscrepancySpecs.statusEquals(req.status()));

        return repo.findAll(spec, pageable).map(mapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public DiscrepancyDto get(UUID id) {
        return repo.findById(id).map(mapper::toDTO)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Discrepancy not found"));
    }

    @Override
    public DiscrepancyDto updateStatus(UUID id, DiscrepancyStatus status) {
        Discrepancy d = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Discrepancy not found"));
        d.setStatus(status != null ? status : d.getStatus());
        return mapper.toDTO(repo.save(d));
    }

    @Override
    public List<DiscrepancyDto> reconcile(UUID orgId, UUID electionId) {
        Organization org = orgRepo.findById(orgId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));
        Election election = electionRepo.findById(electionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Election not found"));

        // Query mismatches from views
        List<DiscrepancyReconcileRepository.Row> mismatches = reconcileRepo.findMismatches(orgId, electionId);

        // Upsert OPEN discrepancies for mismatches
        Map<UUID, Discrepancy> upserted = new HashMap<>();
        for (var r : mismatches) {
            PollingCenter center = centerRepo.findById(r.getCenterId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Center not found"));

            Discrepancy d = repo.findByElection_ElectionIdAndPollingCenter_CenterIdAndOrganization_OrgId(
                            electionId, r.getCenterId(), orgId)
                    .orElseGet(() -> {
                        Discrepancy x = new Discrepancy();
                        x.setElection(election);
                        x.setPollingCenter(center);
                        x.setOrganization(org);
                        x.setStatus(DiscrepancyStatus.OPEN);
                        return x;
                    });

            d.setPartyValid(r.getPartyValid());
            d.setPartyInvalid(r.getPartyInvalid());
            d.setOfficialValid(r.getOfficialValid());
            d.setOfficialInvalid(r.getOfficialInvalid());
            d.setStatus(DiscrepancyStatus.OPEN);
            d.setNotedAt(d.getNotedAt() == null ? LocalDateTime.now() : d.getNotedAt());

            upserted.put(r.getCenterId(), repo.save(d));
        }

        // Auto-resolve any previously OPEN discrepancies that are no longer mismatches
        List<Discrepancy> currentlyOpen = repo.findByElection_ElectionIdAndStatus(electionId, DiscrepancyStatus.OPEN);
        for (Discrepancy d : currentlyOpen) {
            if (d.getOrganization() != null && d.getOrganization().getOrgId().equals(orgId)) {
                if (!upserted.containsKey(d.getPollingCenter().getCenterId())) {
                    d.setStatus(DiscrepancyStatus.RESOLVED);
                    repo.save(d);
                }
            }
        }

        return upserted.values().stream().map(mapper::toDTO).toList();
    }
}
