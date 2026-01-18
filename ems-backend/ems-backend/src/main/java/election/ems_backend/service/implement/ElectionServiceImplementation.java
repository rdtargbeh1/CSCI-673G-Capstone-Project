package election.ems_backend.service.implement;


import election.ems_backend.dto.ElectionCreateRequest;
import election.ems_backend.dto.ElectionDto;
import election.ems_backend.dto.ElectionSearchRequest;
import election.ems_backend.dto.ElectionUpdateRequest;
import election.ems_backend.entity.Election;
import election.ems_backend.mapper.ElectionMapper;
import election.ems_backend.repository.ElectionRepository;
import election.ems_backend.repository.StatsRepository;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.security.CurrentUserProvider;
import election.ems_backend.service.AuditLogService;
import election.ems_backend.service.ElectionService;
import election.ems_backend.service.ElectionStatsProjection;
import election.ems_backend.utility.ElectionSpecs;
import election.ems_backend.utility.ElectionStatsDto;
import election.ems_backend.utility.TenantContext;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class ElectionServiceImplementation implements ElectionService {

    @PersistenceContext
    EntityManager em;

    private final ElectionRepository electionRepository;
    private final StatsRepository statsRepository;
    private final ElectionMapper electionMapper;
    private final AuthorizationService authz;
    private final CurrentUserProvider currentUserProvider;
    private final AuditLogService auditLogService;
    private final JdbcTemplate jdbc;

    /**
     * Handles all core business operations for the Election entity.
     * Provides methods to create, update, delete, retrieve, and search elections.
     *
     * <p>This service ensures that:
     * <ul>
     *   <li>Each election name and year combination is unique.</li>
     *   <li>Appropriate HTTP status codes are returned when resources are missing or duplicate.</li>
     * </ul>
     * </p>
     */
    @Override
    @Transactional
    public ElectionDto create(ElectionCreateRequest req) {
        if (electionRepository.existsByElectionNameIgnoreCaseAndYear(
                req.getElectionName(), req.getYear())) {
            throw new ResponseStatusException(CONFLICT, "Election '" + req.getElectionName() + "' (" + req.getYear() + ") already exists"
            );
        }
        Election saved = electionRepository.save(electionMapper.toEntity(req));

        // Audit log (best-effort)
        try {
            // Resolve actor user id in a type-safe way
            UUID actor = null;
            // 1) prefer currentUserProvider if available
            try {
                actor = (currentUserProvider != null ? currentUserProvider.currentUserId() : null);
            } catch (Exception ignored) {}
            // 2) fallback to TenantContext if still null
            if (actor == null) {
                try {
                    var ctx = TenantContext.get();
                    if (ctx != null) actor = ctx.userId().orElse(null);
                } catch (Exception ignored) {}
            }
            String desc = "Created election: " + saved.getElectionName();
        } catch (Exception ignored) {}


        return electionMapper.toDTO(saved);
    }


    // ElectionServiceImplementation.java (update)
    @Override
    @Transactional
    public ElectionDto update(UUID electionId, ElectionUpdateRequest req) {
        Election election = electionRepository.findById(electionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Election not found"));

        if (req.getElectionName() != null && !req.getElectionName().trim().isEmpty()) {
            election.setElectionName(req.getElectionName().trim());
        }

        if (req.getYear() != null) {
            Integer year = req.getYear();
            if (year < 1900) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Year must be >= 1900");
            }
            election.setYear(year); // entity is int; auto-unbox is safe because year != null
        }

        if (req.getElectionType() != null) {
            election.setElectionType(req.getElectionType());
        }

        if (req.getIsActive() != null) {
            election.setActive(req.getIsActive());
        }

        Election saved = electionRepository.save(election);
        return electionMapper.toDTO(saved);
    }


    /**
     * Deletes an election by its unique identifier.
     *
     * @param id the unique identifier of the election to delete.
     * @throws ResponseStatusException if the election does not exist.
     */
    @Override
    @Transactional
    public void delete(UUID id) {

        if (!electionRepository.existsById(id)) {
            throw new ResponseStatusException(NOT_FOUND, "Election not found");
        }

        // Prevent deletion when official NEC results exist for this election
        Number cnt = (Number) em.createNativeQuery(
                        "select count(*) from nec_result where election_id = ?"
                ).setParameter(1, id) // ✅ FIX: bind UUID, not String
                .getSingleResult();

        if (cnt != null && cnt.longValue() > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot delete election with official results");
        }

        electionRepository.deleteById(id);
    }

    /**
     * Retrieves a single election by its unique identifier.
     *
     * @param id the unique identifier of the election.
     * @return a DTO representing the election.
     * @throws ResponseStatusException if the election is not found.
     */
    @Override
    public ElectionDto get(UUID id) {

        return electionRepository.findById(id)
                .map(electionMapper::toDTO)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Election not found"));
    }


    @Override
    public List<ElectionDto> listActiveElections() {
        List<Election> elections = electionRepository.findByIsActiveTrueOrderByDateCreatedDesc();
        return elections.stream()
                .map(electionMapper::toDTO)
                .toList();
    }

    @Override
    public List<ElectionDto> listAllElections() {
        return electionRepository.findAll().stream()
                .map(electionMapper::toDTO)
                .toList();
    }

    /**
     * Searches for elections based on filters such as name, year, type, and active status.
     *
     * @param req      the search filters encapsulated in an {@link ElectionSearchRequest}.
     * @param pageable pagination and sorting details.
     * @return a paginated list of elections that match the given criteria.
     */
    @Override
    public Page<ElectionDto> search(ElectionSearchRequest req, Pageable pageable) {
        Specification<Election> spec = Specification
                .where(ElectionSpecs.nameContains(req.q()))
                .and(ElectionSpecs.yearEquals(req.year()))
                .and(ElectionSpecs.typeEquals(req.type()))
                .and(ElectionSpecs.activeEquals(req.active()));

        return electionRepository.findAll(spec, pageable)
                .map(electionMapper::toDTO);
    }

    @Override
    @Transactional
    public ElectionDto setActive(UUID id, boolean active) {
        Election e = electionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Election not found"));
        e.setActive(active);
        return electionMapper.toDTO(electionRepository.save(e));
    }


    @Override
    public ElectionStatsDto getOrgElectionStats(UUID orgId, UUID electionId) {
        ElectionStatsProjection p = statsRepository
                .findOrgElectionStats(orgId, electionId)
                .orElse(null);

        if (p == null) {
            // No row yet → return empty stats instead of error
            return ElectionStatsDto.builder()
                    .orgId(orgId)
                    .electionId(electionId)
                    .registeredVoters(0)
                    .ballotsCast(0)
                    .validVotes(0)
                    .invalidTotal(0)
                    .turnoutPct(BigDecimal.ZERO)
                    .invalidPct(BigDecimal.ZERO)
                    .build();
        }

        return ElectionStatsDto.builder()
                .orgId(p.getOrgId())
                .electionId(p.getElectionId())
                .registeredVoters(p.getRegisteredVoters() != null ? p.getRegisteredVoters() : 0)
                .ballotsCast(p.getBallotsCast() != null ? p.getBallotsCast() : 0)
                .validVotes(p.getValidVotes() != null ? p.getValidVotes() : 0)
                .invalidTotal(p.getInvalidTotal() != null ? p.getInvalidTotal() : 0)
                .turnoutPct(p.getTurnoutPct() != null ? p.getTurnoutPct() : BigDecimal.ZERO)
                .invalidPct(p.getInvalidPct() != null ? p.getInvalidPct() : BigDecimal.ZERO)
                .build();
    }





}
