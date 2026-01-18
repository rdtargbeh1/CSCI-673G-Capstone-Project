package election.ems_backend.service;

import election.ems_backend.dto.CandidateCreateRequest;
import election.ems_backend.dto.CandidateDto;
import election.ems_backend.dto.CandidateUpdateRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface CandidateService {
    CandidateDto create(CandidateCreateRequest req);
    CandidateDto update(UUID id, CandidateUpdateRequest req);
    void delete(UUID id);
    CandidateDto get(UUID id);
    Page<CandidateDto> search(String q,
                              String position,
                              UUID partyId,
                              Boolean active,
                              Boolean independent, // ✅ NEW
                              Pageable pageable);

//    Page<CandidateDto> search(String q, String position, UUID partyId, Boolean active, Pageable pageable);

}