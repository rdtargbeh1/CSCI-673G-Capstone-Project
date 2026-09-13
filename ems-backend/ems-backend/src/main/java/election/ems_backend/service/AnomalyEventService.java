package election.ems_backend.service;

import election.ems_backend.dto.AnomalyEventCreateRequest;
import election.ems_backend.dto.AnomalyEventDto;
import election.ems_backend.dto.AnomalyEventUpdateRequest;
import election.ems_backend.enums.AnomalyKind;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.UUID;

public interface AnomalyEventService {
    AnomalyEventDto create(AnomalyEventCreateRequest req);
    AnomalyEventDto update(UUID anomalyId, AnomalyEventUpdateRequest req);
    void delete(UUID anomalyId);
    AnomalyEventDto get(UUID anomalyId);

    Page<AnomalyEventDto> search(UUID orgId, UUID electionId, UUID centerId,
                                 AnomalyKind kind, LocalDateTime from, LocalDateTime to,
                                 String q, Pageable pageable);
}
