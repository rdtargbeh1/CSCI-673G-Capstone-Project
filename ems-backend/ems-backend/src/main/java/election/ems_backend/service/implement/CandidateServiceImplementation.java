package election.ems_backend.service.implement;

import election.ems_backend.dto.CandidateCreateRequest;
import election.ems_backend.dto.CandidateDto;
import election.ems_backend.dto.CandidateUpdateRequest;
import election.ems_backend.entity.Candidate;
import election.ems_backend.entity.Party;
import election.ems_backend.mapper.CandidateMapper;
import election.ems_backend.repository.CandidateRepository;
import election.ems_backend.repository.PartyRepository;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.security.CurrentUserProvider;
import election.ems_backend.service.CandidateService;
import election.ems_backend.utility.CandidateSpecs;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
public class CandidateServiceImplementation implements CandidateService {

    @Autowired
    private CandidateRepository candidateRepository;
    @Autowired
    private PartyRepository partyRepository;

    private final CurrentUserProvider currentUserProvider;
    private final JdbcTemplate jdbc;
    private final AuthorizationService authz;
    private final CandidateMapper mapper = new CandidateMapper();



    @Override
    public CandidateDto create(CandidateCreateRequest req) {

        authz.requireNecAdminOrPlatformAdmin();  // Only NEC admin or platform admin can update candidates

        // Determine independent flag explicitly
        boolean isIndependent = Boolean.TRUE.equals(req.getIndependent());
        Party party = null;

        if (isIndependent) {
            // Independent candidate MUST NOT have a party
            if (req.getPartyId() != null) {
                throw new ResponseStatusException(
                        BAD_REQUEST, "Independent candidates cannot belong to a party"
                );
            }

            // Duplicate guard for independents
            if (candidateRepository.existsByFullNameIgnoreCaseAndPartyIsNull(req.getFullName())) {
                throw new ResponseStatusException(
                        CONFLICT, "Independent candidate with this name already exists"
                );
            }
        } else {
            // Party candidate
            if (req.getPartyId() == null) {
                throw new ResponseStatusException(
                        BAD_REQUEST, "partyId is required unless candidate is independent"
                );
            }
            party = partyRepository.findById(req.getPartyId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Party not found"));

            // Duplicate guard within party
            if (candidateRepository.existsByFullNameIgnoreCaseAndParty_PartyId(
                    req.getFullName(), party.getPartyId())) {

                throw new ResponseStatusException(
                        CONFLICT, "Candidate already exists in this party"
                );
            }
        }
        Candidate saved = candidateRepository.save(mapper.toEntity(req, party));

        // Audit log (best-effort)
        try {
            UUID actor = currentUserProvider.currentUserId();
            String desc = "Candidate created: " + saved.getFullName() + " (" + saved.getCandidateId() + ")";
            jdbc.update(
                    "INSERT INTO audit_log (log_id, org_id, user_id, activity_type, entity_affected, action_description) VALUES (gen_random_uuid(), NULL, ?, ?, ?, ?)",
                    new Object[] { actor, "CANDIDATE_CREATE", "candidate", desc }
            );
        } catch (Exception ignored) {}


        return mapper.toDTO(saved);
    }



    @Override
    public CandidateDto update(UUID id, CandidateUpdateRequest req) {

        authz.requireNecAdminOrPlatformAdmin();  // Only NEC admin or platform admin can update candidates

        Candidate entity = candidateRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Candidate not found"));

        boolean newIndependentFlag = (req.getIndependent() != null)
                ? req.getIndependent()
                : entity.isIndependent();

        Party newParty = null;

        // ─────────────────────────────────────────────
        // A) Candidate becomes INDEPENDENT
        // ─────────────────────────────────────────────
        if (newIndependentFlag) {
            // Cannot set a party while independent
            if (req.getPartyId() != null) {
                throw new ResponseStatusException(
                        BAD_REQUEST, "Independent candidates cannot belong to a party"
                );
            }
            // Duplicate guard for rename among independents
            if (req.getFullName() != null) {
                boolean dup = candidateRepository.existsByFullNameIgnoreCaseAndPartyIsNull(req.getFullName())
                        && !req.getFullName().equalsIgnoreCase(entity.getFullName());

                if (dup) {
                    throw new ResponseStatusException(
                            CONFLICT, "Independent candidate with this name already exists"
                    );
                }
            }
            newParty = null; // Force party = null
        }

        // ─────────────────────────────────────────────
        // B) Candidate remains or becomes PARTY candidate
        // ─────────────────────────────────────────────
        else {
            if (req.getPartyId() != null) {
                newParty = partyRepository.findById(req.getPartyId())
                        .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Party not found"));
            } else {
                // If not independent, must have a party
                if (entity.getParty() == null) {
                    throw new ResponseStatusException(
                            BAD_REQUEST, "partyId is required for non-independent candidates"
                    );
                }
                newParty = entity.getParty(); // Keep existing party
            }
            // Duplicate guard inside the party
            String newName = req.getFullName() != null ? req.getFullName() : entity.getFullName();

            boolean dup = candidateRepository.existsByFullNameIgnoreCaseAndParty_PartyId(
                    newName, newParty.getPartyId())
                    && !(entity.getParty() != null
                    && newParty.getPartyId().equals(entity.getParty().getPartyId())
                    && newName.equalsIgnoreCase(entity.getFullName()));

            if (dup) {
                throw new ResponseStatusException(
                        CONFLICT, "Candidate with this name already exists in the target party"
                );
            }
        }

        // Apply changes
        mapper.apply(req, entity, newParty);
        Candidate saved = candidateRepository.save(entity);

        // Audit log
        try {
            UUID actor = currentUserProvider.currentUserId();
            String desc = "Candidate updated: " + saved.getFullName() + " (" + saved.getCandidateId() + ")";
            jdbc.update(
                    "INSERT INTO audit_log (log_id, org_id, user_id, activity_type, entity_affected, action_description) VALUES (gen_random_uuid(), NULL, ?, ?, ?, ?)",
                    new Object[] { actor, "CANDIDATE_UPDATE", "candidate", desc }
            );
        } catch (Exception ignored) {}


        return mapper.toDTO(saved);
    }


    @Override
    public void delete(UUID id) {

        authz.requireNecAdminOrPlatformAdmin();  // Only NEC admin or platform admin can update candidates

        if (!candidateRepository.existsById(id)) {
            throw new ResponseStatusException(NOT_FOUND, "Candidate not found");
        }
        candidateRepository.deleteById(id);

        // Audit log
        try {
            UUID actor = currentUserProvider.currentUserId();
            String desc = "Candidate deleted: " + id;
            jdbc.update(
                    "INSERT INTO audit_log (log_id, org_id, user_id, activity_type, entity_affected, action_description) VALUES (gen_random_uuid(), NULL, ?, ?, ?, ?)",
                    new Object[] { actor, "CANDIDATE_DELETE", "candidate", desc }
            );
        } catch (Exception ignored) {}
    }

    @Override
    public CandidateDto get(UUID id) {
        return candidateRepository.findById(id)
                .map(mapper::toDTO)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Candidate not found"));
    }

    @Override
    public Page<CandidateDto> search(String q,
                                     String position,
                                     UUID partyId,
                                     Boolean active,
                                     Boolean independent, // ✅ NEW
                                     Pageable pageable) {

        Specification<Candidate> spec = Specification
                .where(CandidateSpecs.nameContains(q))
                .and(CandidateSpecs.positionContains(position))
                .and(CandidateSpecs.partyEquals(partyId))
                .and(CandidateSpecs.activeEquals(active))
                .and(CandidateSpecs.independentEquals(independent)); // ✅ NEW

        return candidateRepository.findAll(spec, pageable).map(mapper::toDTO);
    }



}
