package election.ems_backend.service;

import election.ems_backend.dto.ElectionCandidateCreateRequest;
import election.ems_backend.dto.ElectionCandidateDto;
import election.ems_backend.dto.ElectionCandidateUpdateRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface ElectionCandidateService {
    ElectionCandidateDto create(ElectionCandidateCreateRequest req);

    ElectionCandidateDto update(UUID id, ElectionCandidateUpdateRequest req);

    void delete(UUID id);

    ElectionCandidateDto get(UUID id);

    Page<ElectionCandidateDto> getAll(Pageable pageable);

    List<ElectionCandidateDto> listByElection(UUID electionId);
}
