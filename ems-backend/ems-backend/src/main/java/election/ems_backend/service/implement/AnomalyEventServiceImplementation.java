package election.ems_backend.service.implement;

import election.ems_backend.dto.AnomalyEventCreateRequest;
import election.ems_backend.dto.AnomalyEventDto;
import election.ems_backend.dto.AnomalyEventUpdateRequest;
import election.ems_backend.entity.AnomalyEvent;
import election.ems_backend.entity.Election;
import election.ems_backend.entity.Organization;
import election.ems_backend.entity.PollingCenter;
import election.ems_backend.enums.AnomalyKind;
import election.ems_backend.mapper.AnomalyEventMapper;
import election.ems_backend.repository.AnomalyEventRepository;
import election.ems_backend.repository.ElectionRepository;
import election.ems_backend.repository.OrganizationRepository;
import election.ems_backend.repository.PollingCenterRepository;
import election.ems_backend.service.AnomalyEventService;
import election.ems_backend.utility.AnomalyEventSpecs;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AnomalyEventServiceImplementation implements AnomalyEventService {

    private final AnomalyEventRepository repo;
    private final OrganizationRepository orgRepo;
    private final ElectionRepository electionRepo;
    private final PollingCenterRepository centerRepo;
    private final AnomalyEventMapper mapper;

    @Override
    public AnomalyEventDto create(AnomalyEventCreateRequest req) {
        Organization org = orgRepo.findById(req.getOrgId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Organization not found"));
        Election election = electionRepo.findById(req.getElectionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Election not found"));

        PollingCenter center = null;
        if (req.getCenterId() != null) {
            center = centerRepo.findById(req.getCenterId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Polling center not found"));
        }

        // (Optional) simple de-dup window (e.g., 10 minutes)
        if (center != null && repo.existsRecentOfSameKindAtCenter(
                org.getOrgId(), election.getElectionId(), center.getCenterId(), req.getKind(),
                LocalDateTime.now().minusMinutes(10))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Similar anomaly recently recorded at this center");
        }

        AnomalyEvent saved = repo.save(mapper.toEntity(req, org, election, center));
        return mapper.toDTO(saved);
    }

    @Override
    public AnomalyEventDto update(UUID anomalyId, AnomalyEventUpdateRequest req) {
        AnomalyEvent entity = repo.findById(anomalyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Anomaly not found"));

        PollingCenter center = null;
        if (req.getCenterId() != null) {
            center = centerRepo.findById(req.getCenterId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Polling center not found"));
        }

        mapper.apply(req, entity, center);
        return mapper.toDTO(repo.save(entity));
    }

    @Override
    public void delete(UUID anomalyId) {
        if (!repo.existsById(anomalyId)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Anomaly not found");
        repo.deleteById(anomalyId);
    }

    @Override
    @Transactional(readOnly = true)
    public AnomalyEventDto get(UUID anomalyId) {
        return repo.findById(anomalyId).map(mapper::toDTO)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Anomaly not found"));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AnomalyEventDto> search(UUID orgId, UUID electionId, UUID centerId,
                                        AnomalyKind kind, LocalDateTime from, LocalDateTime to,
                                        String q, Pageable pageable) {

        Specification<AnomalyEvent> spec = Specification
                .where(AnomalyEventSpecs.orgEquals(orgId))
                .and(AnomalyEventSpecs.electionEquals(electionId))
                .and(AnomalyEventSpecs.centerEquals(centerId))
                .and(AnomalyEventSpecs.kindEquals(kind))
                .and(AnomalyEventSpecs.between(from, to))
                .and(AnomalyEventSpecs.textSearch(q));

        return repo.findAll(spec, pageable).map(mapper::toDTO);
    }

}
