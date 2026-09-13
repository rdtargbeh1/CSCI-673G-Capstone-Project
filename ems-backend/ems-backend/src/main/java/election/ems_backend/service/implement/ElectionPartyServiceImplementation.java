package election.ems_backend.service.implement;

import election.ems_backend.dto.ElectionPartyAssignRequest;
import election.ems_backend.dto.ElectionPartyDto;
import election.ems_backend.dto.ElectionPartyUpdateRequest;
import election.ems_backend.entity.Election;
import election.ems_backend.entity.ElectionParty;
import election.ems_backend.entity.Party;
import election.ems_backend.mapper.ElectionPartyMapper;
import election.ems_backend.repository.ElectionPartyRepository;
import election.ems_backend.repository.ElectionRepository;
import election.ems_backend.repository.PartyRepository;
import election.ems_backend.service.ElectionPartyService;
import election.ems_backend.utility.ElectionPartyId;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ElectionPartyServiceImplementation implements ElectionPartyService {

    private final ElectionPartyRepository electionPartyRepository;
    private final ElectionRepository electionRepository;
    private final PartyRepository partyRepository;
    private final ElectionPartyMapper mapper;


    @Override
    @Transactional
    public ElectionPartyDto addPartyToElection(ElectionPartyAssignRequest req) {
        UUID electionId = req.getElectionId();
        UUID partyId = req.getPartyId();

        // 1) Prevent duplicates
        if (electionPartyRepository.existsByElection_ElectionIdAndParty_PartyId(electionId, partyId)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Party is already registered for this election"
            );
        }

        // 2) Load election + party
        Election election = electionRepository.findById(electionId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Election not found: " + electionId));

        Party party = partyRepository.findById(partyId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Party not found: " + partyId));

        // 3) Determine ballot order
        Integer ballotOrder = req.getBallotOrder();
        if (ballotOrder == null) {
            int max = electionPartyRepository.findMaxBallotOrder(electionId);
            ballotOrder = max + 1;
        }

        // 4) Build entity
        ElectionParty entity = ElectionParty.builder()
                .id(new ElectionPartyId(electionId, partyId))
                .election(election)
                .party(party)
                .ballotOrder(ballotOrder) // ✅ fixed typo
                .isQualified(req.getIsQualified() == null ? Boolean.TRUE : req.getIsQualified())
                .build();

        // 5) Save + return DTO
        return mapper.toDto(electionPartyRepository.save(entity)); // ✅ use toDto(...)
    }



    @Override
    @Transactional
    public ElectionPartyDto updateElectionParty(UUID electionId,
                                                UUID partyId,
                                                ElectionPartyUpdateRequest req) {
        ElectionPartyId id = new ElectionPartyId(electionId, partyId);

        ElectionParty entity = electionPartyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Election–Party registration not found"));

        if (req.getBallotOrder() != null) {
            entity.setBallotOrder(req.getBallotOrder());
        }

        if (req.getIsQualified() != null) {
            entity.setQualified(req.getIsQualified());
        }

        return mapper.toDto(electionPartyRepository.save(entity));
    }


    @Override
    @Transactional
    public void removePartyFromElection(UUID electionId, UUID partyId) {
        var id = new election.ems_backend.utility.ElectionPartyId(electionId, partyId);
        if (!electionPartyRepository.existsById(id)) {
            throw new NoSuchElementException("Election–Party link not found");
        }
        electionPartyRepository.deleteById(id);
    }

    @Override
    public List<ElectionPartyDto> listPartiesForElection(UUID electionId) {
        List<ElectionParty> list = electionPartyRepository
                .findByElection_ElectionIdOrderByBallotOrderAscParty_PartyNameAsc(electionId);

        return list.stream().map(mapper::toDto).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ElectionPartyDto setQualificationStatus(
            UUID electionId,
            UUID partyId,
            boolean isQualified) {

        ElectionPartyId id = new ElectionPartyId(electionId, partyId);

        ElectionParty entity = electionPartyRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Election–Party registration not found"));

        entity.setQualified(isQualified);

        return mapper.toDto(electionPartyRepository.save(entity));
    }

}
