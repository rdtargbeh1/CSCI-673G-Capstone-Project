package election.ems_backend.service;

import election.ems_backend.dto.PartyCreateRequest;
import election.ems_backend.dto.PartyDto;
import election.ems_backend.dto.PartyUpdateRequest;
import election.ems_backend.utility.PartySearchRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.UUID;

public interface PartyService {

    PartyDto create(PartyCreateRequest req);

    Optional<PartyDto> get(UUID partyId);

    Optional<PartyDto> getByAbbreviation(String abbrev);

    Page<PartyDto> search(PartySearchRequest req, Pageable pageable);

    PartyDto update(UUID partyId, PartyUpdateRequest req);

    void delete(UUID partyId); // guarded if referenced
}