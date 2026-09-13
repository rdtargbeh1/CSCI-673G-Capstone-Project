package election.ems_backend.service.implement;

import election.ems_backend.dto.ElectionCandidateCreateRequest;
import election.ems_backend.dto.ElectionCandidateDto;
import election.ems_backend.dto.ElectionCandidateUpdateRequest;
import election.ems_backend.entity.Candidate;
import election.ems_backend.entity.Election;
import election.ems_backend.entity.ElectionCandidate;
import election.ems_backend.entity.PollingCenter;
import election.ems_backend.mapper.ElectionCandidateMapper;
import election.ems_backend.repository.*;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.security.CurrentUserProvider;
import election.ems_backend.service.ElectionCandidateService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

import static org.springframework.http.HttpStatus.*;
import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class ElectionCandidateServiceImplementation implements ElectionCandidateService {

    private final ElectionCandidateRepository electionCandidateRepository;
    private final ElectionRepository electionRepo;
    private final CandidateRepository candidateRepository;
    private final PollingCenterRepository pollingCenterRepository;
    private final ElectionPartyRepository electionPartyRepository;

    private final AuthorizationService authz;
    private final CurrentUserProvider currentUserProvider;
    private final JdbcTemplate jdbc;
    private final ElectionCandidateMapper mapper;



    @Override
    public ElectionCandidateDto create(ElectionCandidateCreateRequest req) {

        // Authoritative guard in service
        authz.requireNecAdminOrPlatformAdmin();

        // 1) Prevent duplicate candidate in the same election
        if (electionCandidateRepository
                .existsByElection_ElectionIdAndCandidate_CandidateId(req.getElectionId(), req.getCandidateId())) {
            throw new ResponseStatusException(CONFLICT, "Candidate is already registered for this election");
        }

        // 2) Load election and candidate
        Election election = electionRepo.findById(req.getElectionId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Election not found"));
        Candidate candidate = candidateRepository.findById(req.getCandidateId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Candidate not found"));
        // 3) Optional polling center (null = nationwide/district-scoped)
        PollingCenter center = (req.getCenterId() != null)
                ? pollingCenterRepository.findById(req.getCenterId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Polling center not found"))
                : null;
        // 4) Enforce party vs. independent rules at service level
        if (candidate.isIndependent()) {
            // Independent candidate must NOT have a party_id
            if (candidate.getParty() != null) {
                throw new ResponseStatusException(BAD_REQUEST, "Independent candidate must not have a party assigned");
            }
            // No election_party check needed for independents
        } else {
            // Party-based candidate must have a party
            if (candidate.getParty() == null || candidate.getParty().getPartyId() == null) {
                throw new ResponseStatusException(BAD_REQUEST,
                        "Candidate must have a party assigned before being registered to an election"
                );
            }

            UUID partyId = candidate.getParty().getPartyId();

            // Ensure that party is registered for this election (election_party table)
            boolean partyRegistered = electionPartyRepository
                    .existsByElection_ElectionIdAndParty_PartyId(election.getElectionId(), partyId);

            if (!partyRegistered) {
                throw new ResponseStatusException(
                        CONFLICT, "Party " + candidate.getParty().getAbbreviation()
                        + " is not registered for election '" + election.getElectionName() + "'");
            }
        }
        // 5) Persist election-candidate
        ElectionCandidate saved =
                electionCandidateRepository.save(mapper.toEntity(req, election, candidate, center));

        // Audit log (best-effort)
        try {
            UUID actor = currentUserProvider.currentUserId();
            String desc = "ElectionCandidate created: electId=" + saved.getElectId();
            jdbc.update("INSERT INTO audit_log (log_id, org_id, user_id, activity_type, entity_affected, action_description) VALUES (gen_random_uuid(), NULL, ?, ?, ?, ?)",
                    new Object[]{actor, "ELECTION_CANDIDATE_CREATE", "election_candidate", desc});
        } catch (Exception ignored) {}

        return mapper.toDTO(saved);   // use toDTO or toDto based on your mapper signature
    }


    @Override
    public ElectionCandidateDto update(UUID id, ElectionCandidateUpdateRequest req) {

        authz.requireNecAdminOrPlatformAdmin();

        ElectionCandidate ec = electionCandidateRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Election candidate not found"));

        PollingCenter newCenter = null;
        if (req.getCenterId() != null) {
            newCenter = pollingCenterRepository.findById(req.getCenterId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Polling center not found"));
        }

        // If changing center, ensure uniqueness still holds
        if (newCenter != null && (ec.getPollingCenter() == null || !newCenter.getCenterId().equals(ec.getPollingCenter().getCenterId()))) {
            boolean dup = electionCandidateRepository.existsByElection_ElectionIdAndCandidate_CandidateIdAndPollingCenter_CenterId(
                    ec.getElection().getElectionId(), ec.getCandidate().getCandidateId(), newCenter.getCenterId()
            );
            if (dup) {
                throw new ResponseStatusException(CONFLICT, "Another entry already exists for this election/candidate/center");
            }
        }

        mapper.apply(req, ec, newCenter);
        ElectionCandidate saved = electionCandidateRepository.save(ec);

        // Audit log
        try {
            UUID actor = currentUserProvider.currentUserId();
            String desc = "ElectionCandidate updated: electId=" + saved.getElectId();
            jdbc.update("INSERT INTO audit_log (log_id, org_id, user_id, activity_type, entity_affected, action_description) VALUES (gen_random_uuid(), NULL, ?, ?, ?, ?)",
                    new Object[]{actor, "ELECTION_CANDIDATE_UPDATE", "election_candidate", desc});
        } catch (Exception ignored) {}

        return mapper.toDTO(saved);

    }



    @Override
    public void delete(UUID id) {

        authz.requireNecAdminOrPlatformAdmin();

        if (!electionCandidateRepository.existsById(id)) {
            throw new ResponseStatusException(NOT_FOUND, "Election candidate not found");
        }
        electionCandidateRepository.deleteById(id);

        // Audit log
        try {
            UUID actor = currentUserProvider.currentUserId();
            String desc = "ElectionCandidate deleted: " + id;
            jdbc.update("INSERT INTO audit_log (log_id, org_id, user_id, activity_type, entity_affected, action_description) VALUES (gen_random_uuid(), NULL, ?, ?, ?, ?)",
                    new Object[]{actor, "ELECTION_CANDIDATE_DELETE", "election_candidate", desc});
        } catch (Exception ignored) {}
    }

    @Override
    public ElectionCandidateDto get(UUID id) {
        return electionCandidateRepository.findById(id)
                .map(mapper::toDTO)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Election candidate not found"));
    }


    @Override
    public List<ElectionCandidateDto> listByElection(UUID electionId) {
        // Optional: verify election exists (helps return 404 instead of empty list if typo)
        electionRepo.findById(electionId)
                .orElseThrow(() -> new ResponseStatusException(
                        NOT_FOUND,
                        "Election not found"
                ));

        return electionCandidateRepository
                .findByElection_ElectionId(electionId)
                .stream()
                .map(mapper::toDTO)
                .toList();
    }



    @Override
    public Page<ElectionCandidateDto> getAll(Pageable pageable) {
        return electionCandidateRepository.findAll(pageable).map(mapper::toDTO);
    }
}
