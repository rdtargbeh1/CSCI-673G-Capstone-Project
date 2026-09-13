package election.ems_backend.service.implement;

import election.ems_backend.dto.PartyCreateRequest;
import election.ems_backend.dto.PartyDto;
import election.ems_backend.dto.PartyUpdateRequest;
import election.ems_backend.entity.Party;
import election.ems_backend.mapper.PartyMapper;
import election.ems_backend.repository.OrganizationRepository;
import election.ems_backend.repository.PartyRepository;
import election.ems_backend.service.PartyService;
import election.ems_backend.utility.PartySearchRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;

import static election.ems_backend.utility.QueryUtils.normalize;


@Service
@RequiredArgsConstructor
@Transactional
public class PartyServiceImplementation implements PartyService {

    @Autowired
    private PartyRepository partyRepository;
    @Autowired
    private OrganizationRepository organizationRepository;
    private final PartyMapper mapper = new PartyMapper();


    @Override
    public PartyDto create(PartyCreateRequest req) {
        // 1) Friendly uniqueness checks (match global UNIQUE in SQL)
        if (partyRepository.existsByPartyNameIgnoreCase(req.getPartyName())) {
            throw new IllegalArgumentException("Party name already exists");
        }
        if (partyRepository.existsByAbbreviationIgnoreCase(req.getAbbreviation())) {
            throw new IllegalArgumentException("Abbreviation already exists");
        }

        // 2) Global party: no TenantContext, no Organization reference
        Party entity = mapper.toEntity(req);

        try {
            Party saved = partyRepository.save(entity);
            return mapper.toDTO(saved);
        } catch (DataIntegrityViolationException e) {
            // Race protection for UNIQUE constraints
            throw new IllegalArgumentException("Party name or abbreviation already exists");
        }
    }


    @Override
    @Transactional(readOnly = true)
    public Optional<PartyDto> get(UUID partyId) {
        return partyRepository.findById(partyId).map(mapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<PartyDto> getByAbbreviation(String abbrev) {
        if (abbrev == null || abbrev.isBlank()) return Optional.empty();
        return partyRepository.findByAbbreviationIgnoreCase(abbrev).map(mapper::toDTO);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PartyDto> search(PartySearchRequest req, Pageable pageable) {
        return partyRepository
                .search(normalize(req != null ? req.getQ() : null), pageable)
                .map(mapper::toDTO);
    }


    @Override
    public PartyDto update(UUID partyId, PartyUpdateRequest req) {
        Party p = partyRepository.findById(partyId)
                .orElseThrow(() -> new NoSuchElementException("Party not found"));

        // uniqueness if changed
        if (req.getPartyName() != null &&
                partyRepository.existsByPartyNameIgnoreCaseAndPartyIdNot(req.getPartyName(), partyId)) {
            throw new IllegalArgumentException("Party name already exists");
        }
        if (req.getAbbreviation() != null &&
                partyRepository.existsByAbbreviationIgnoreCaseAndPartyIdNot(req.getAbbreviation(), partyId)) {
            throw new IllegalArgumentException("Abbreviation already exists");
        }

        mapper.apply(req, p);
        return mapper.toDTO(p);
    }


    @Override
    public void delete(UUID partyId) {
        Party p = partyRepository.findById(partyId)
                .orElseThrow(() -> new NoSuchElementException("Party not found"));
        partyRepository.delete(p);
    }


}
