package election.ems_backend.service;

import election.ems_backend.dto.*;
import election.ems_backend.utility.ElectionStatsDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface ElectionService {

    ElectionDto create(ElectionCreateRequest req);
    ElectionDto update(UUID id, ElectionUpdateRequest req);
    void delete(UUID id);
    ElectionDto get(UUID id);
    Page<ElectionDto> search(ElectionSearchRequest req, Pageable pageable);

    List<ElectionDto> listActiveElections();

    List<ElectionDto> listAllElections();

    ElectionStatsDto getOrgElectionStats(UUID orgId, UUID electionId);

    ElectionDto setActive(UUID id, boolean active);

    ElectionDto updateLifecycle(UUID electionId, ElectionLifecycleRequest req);

    int archiveExpiredElections();

}
