package election.ems_backend.service.implement;

import election.ems_backend.dto.ElectionCreateRequest;
import election.ems_backend.dto.ElectionDto;
import election.ems_backend.dto.ElectionLifecycleRequest;
import election.ems_backend.dto.ElectionSearchRequest;
import election.ems_backend.dto.ElectionUpdateRequest;
import election.ems_backend.entity.Election;
import election.ems_backend.enums.ElectionAccessStatus;
import election.ems_backend.mapper.ElectionMapper;
import election.ems_backend.repository.ElectionRepository;
import election.ems_backend.repository.StatsRepository;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.security.ElectionAccessPolicy;
import election.ems_backend.service.ElectionService;
import election.ems_backend.service.ElectionStatsProjection;
import election.ems_backend.utility.ElectionSpecs;
import election.ems_backend.utility.ElectionStatsDto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.NOT_FOUND;


@Service
@RequiredArgsConstructor
public class ElectionServiceImplementation implements ElectionService {

    @PersistenceContext
    private EntityManager em;

    private final ElectionRepository electionRepository;

    private final StatsRepository statsRepository;

    private final ElectionMapper electionMapper;

    private final AuthorizationService authz;

    private final ElectionAccessPolicy electionAccessPolicy;


    // ========================================================================
    // CREATE
    // ========================================================================

    @Override
    @Transactional
    public ElectionDto create(
            ElectionCreateRequest req
    ) {

        /*
         * Election creation belongs only to:
         *
         * - PLATFORM SYSTEM_ADMIN
         * - NEC tenant NEC_ADMIN
         *
         * ElectionAccessPolicy also verifies that an organization-side
         * NEC_ADMIN actually belongs to an OrganizationType.NEC tenant.
         */
        electionAccessPolicy.requireElectionAdministrator();


        if (req == null) {

            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Election create request is required"
            );
        }


        String electionName =
                normalizeRequiredText(
                        req.getElectionName(),
                        "Election name is required"
                );


        if (
                electionRepository
                        .existsByElectionNameIgnoreCaseAndYear(
                                electionName,
                                req.getYear()
                        )
        ) {

            throw new ResponseStatusException(
                    CONFLICT,
                    "Election '"
                            + electionName
                            + "' ("
                            + req.getYear()
                            + ") already exists"
            );
        }


        Election entity =
                electionMapper.toEntity(
                        req
                );


        entity.setElectionName(
                electionName
        );


        /*
         * Every election begins as an NEC-controlled DRAFT.
         *
         * It is not released to political parties or other tenants
         * merely because the election row exists.
         */
        entity.setAccessStatus(
                ElectionAccessStatus.DRAFT
        );


        /*
         * New DRAFT election may technically exist in the system,
         * but tenant visibility is still blocked by lifecycle policy.
         */
        if (
                req.getBallotSparePercent() != null
        ) {

            validateBallotSparePercent(
                    req.getBallotSparePercent()
            );


            entity.setBallotSparePercent(
                    req.getBallotSparePercent()
            );
        }


        entity.setEnforceBallotsGteRegistered(
                req.getEnforceBallotsGteRegistered() == null
                        || req.getEnforceBallotsGteRegistered()
        );


        Election saved =
                electionRepository.save(
                        entity
                );


        return electionMapper.toDTO(
                saved
        );
    }


    // ========================================================================
    // NORMAL UPDATE
    // ========================================================================

    @Override
    @Transactional
    public ElectionDto update(
            UUID electionId,
            ElectionUpdateRequest req
    ) {

        Election election =
                requireElection(
                        electionId
                );


        /*
         * Authorization + lifecycle state are both checked.
         *
         * Party ADMIN/TENANT_ADMIN cannot update the election.
         *
         * ARCHIVED/CANCELLED elections cannot be modified through
         * the normal update endpoint.
         */
        electionAccessPolicy
                .requireNormalConfigurationUpdate(
                        election
                );


        if (req == null) {

            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Election update request is required"
            );
        }


        String requestedName =
                req.getElectionName() != null
                        ? req.getElectionName().trim()
                        : election.getElectionName();


        int requestedYear =
                req.getYear() != null
                        ? req.getYear()
                        : election.getYear();


        if (
                requestedName == null ||
                        requestedName.isBlank()
        ) {

            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Election name cannot be blank"
            );
        }


        if (requestedYear < 1900) {

            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Year must be greater than or equal to 1900"
            );
        }


        boolean identityChanged =
                !requestedName.equalsIgnoreCase(
                        election.getElectionName()
                )
                        ||
                        requestedYear
                                != election.getYear();


        if (
                identityChanged &&
                        electionRepository
                                .existsByElectionNameIgnoreCaseAndYear(
                                        requestedName,
                                        requestedYear
                                )
        ) {

            throw new ResponseStatusException(
                    CONFLICT,
                    "Election '"
                            + requestedName
                            + "' ("
                            + requestedYear
                            + ") already exists"
            );
        }


        if (
                req.getBallotSparePercent() != null
        ) {

            validateBallotSparePercent(
                    req.getBallotSparePercent()
            );
        }


        electionMapper.apply(
                req,
                election
        );


        /*
         * Normalize the name after mapper application.
         */
        election.setElectionName(
                requestedName
        );


        Election saved =
                electionRepository.save(
                        election
                );


        return electionMapper.toDTO(
                saved
        );
    }


    // ========================================================================
    // LIFECYCLE UPDATE
    // ========================================================================

    @Override
    @Transactional
    public ElectionDto updateLifecycle(
            UUID electionId,
            ElectionLifecycleRequest req
    ) {

        electionAccessPolicy
                .requireLifecycleAdministrator();


        if (req == null) {

            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Election lifecycle request is required"
            );
        }


        Election election =
                requireElection(
                        electionId
                );


        ElectionAccessStatus currentStatus =
                election.getAccessStatus() != null
                        ? election.getAccessStatus()
                        : ElectionAccessStatus.DRAFT;


        ElectionAccessStatus requestedStatus =
                req.getAccessStatus() != null
                        ? req.getAccessStatus()
                        : currentStatus;


        // ====================================================================
        // RESOLVE EFFECTIVE TIMELINE
        // ====================================================================

        LocalDateTime availableAt =
                req.getAvailableAt() != null
                        ? req.getAvailableAt()
                        : election.getAvailableAt();


        LocalDateTime startAt =
                req.getStartAt() != null
                        ? req.getStartAt()
                        : election.getStartAt();


        LocalDateTime endAt =
                req.getEndAt() != null
                        ? req.getEndAt()
                        : election.getEndAt();


        LocalDateTime availableUntil =
                req.getAvailableUntil() != null
                        ? req.getAvailableUntil()
                        : election.getAvailableUntil();


        validateTimeline(
                availableAt,
                startAt,
                endAt,
                availableUntil
        );


        validateLifecycleTransition(
                currentStatus,
                requestedStatus
        );


        // ====================================================================
        // AVAILABLE VALIDATION
        // ====================================================================

        if (
                requestedStatus
                        == ElectionAccessStatus.AVAILABLE
        ) {

            /*
             * AVAILABLE represents formal release of the election.
             *
             * Require the complete timing configuration.
             */
            if (availableAt == null) {

                throw new ResponseStatusException(
                        BAD_REQUEST,
                        "availableAt is required before an election can become AVAILABLE"
                );
            }


            if (startAt == null) {

                throw new ResponseStatusException(
                        BAD_REQUEST,
                        "startAt is required before an election can become AVAILABLE"
                );
            }


            if (endAt == null) {

                throw new ResponseStatusException(
                        BAD_REQUEST,
                        "endAt is required before an election can become AVAILABLE"
                );
            }


            if (availableUntil == null) {

                throw new ResponseStatusException(
                        BAD_REQUEST,
                        "availableUntil is required before an election can become AVAILABLE"
                );
            }


            /*
             * Do not release an election whose availability window
             * has already expired.
             */
            if (
                    !availableUntil.isAfter(
                            LocalDateTime.now()
                    )
            ) {

                throw new ResponseStatusException(
                        BAD_REQUEST,
                        "availableUntil must be in the future when releasing an election"
                );
            }
        }


        // ====================================================================
        // APPLY TIMELINE
        // ====================================================================

        if (
                req.getAvailableAt() != null
        ) {

            election.setAvailableAt(
                    req.getAvailableAt()
            );
        }


        if (
                req.getStartAt() != null
        ) {

            election.setStartAt(
                    req.getStartAt()
            );
        }


        if (
                req.getEndAt() != null
        ) {

            election.setEndAt(
                    req.getEndAt()
            );
        }


        if (
                req.getAvailableUntil() != null
        ) {

            election.setAvailableUntil(
                    req.getAvailableUntil()
            );
        }


        // ====================================================================
        // ARCHIVE TRANSITION
        // ====================================================================

        if (
                requestedStatus
                        == ElectionAccessStatus.ARCHIVED
                        &&
                        currentStatus
                                != ElectionAccessStatus.ARCHIVED
        ) {

            /*
             * archivedAt belongs to the backend.
             *
             * Never accept this timestamp from the client.
             */
            election.setArchivedAt(
                    LocalDateTime.now()
            );


            String reason =
                    normalizeOptionalText(
                            req.getArchivedReason()
                    );


            election.setArchivedReason(
                    reason != null
                            ? reason
                            : "Election archived"
            );
        }


        // ====================================================================
        // CANCEL TRANSITION
        // ====================================================================

        if (
                requestedStatus
                        == ElectionAccessStatus.CANCELLED
                        &&
                        currentStatus
                                != ElectionAccessStatus.CANCELLED
        ) {

            String reason =
                    normalizeOptionalText(
                            req.getArchivedReason()
                    );


            /*
             * We currently reuse archivedReason as the lifecycle explanation
             * because the schema intentionally has only one reason field.
             */
            election.setArchivedReason(
                    reason != null
                            ? reason
                            : "Election cancelled"
            );
        }


        election.setAccessStatus(
                requestedStatus
        );


        Election saved =
                electionRepository.save(
                        election
                );


        return electionMapper.toDTO(
                saved
        );
    }


    // ========================================================================
    // DELETE
    // ========================================================================

    @Override
    @Transactional
    public void delete(
            UUID electionId
    ) {

        electionAccessPolicy
                .requireElectionAdministrator();


        Election election =
                requireElection(
                        electionId
                );


        /*
         * Once an election has been released from DRAFT,
         * preserve its historical record.
         *
         * Use CANCELLED or ARCHIVED instead of physical deletion.
         */
        if (
                election.getAccessStatus()
                        != ElectionAccessStatus.DRAFT
        ) {

            throw new ResponseStatusException(
                    CONFLICT,
                    "Only DRAFT elections may be deleted. Released elections must be cancelled or archived."
            );
        }


        // ====================================================================
        // OFFICIAL NEC RESULT PROTECTION
        // ====================================================================

        Number resultCount =
                (Number) em
                        .createNativeQuery(
                                """
                                SELECT COUNT(*)
                                FROM nec_result
                                WHERE election_id = ?
                                """
                        )
                        .setParameter(
                                1,
                                electionId
                        )
                        .getSingleResult();


        if (
                resultCount != null &&
                        resultCount.longValue() > 0
        ) {

            throw new ResponseStatusException(
                    CONFLICT,
                    "Cannot delete election with official NEC results"
            );
        }


        electionRepository.delete(
                election
        );
    }


    // ========================================================================
    // GET SINGLE ELECTION
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public ElectionDto get(
            UUID electionId
    ) {

        Election election =
                requireElection(
                        electionId
                );


        /*
         * SYSTEM USER:
         *     full registry visibility
         *
         * NEC MEMBER:
         *     full lifecycle visibility
         *
         * REGULAR TENANT:
         *     lifecycle-restricted visibility
         */
        electionAccessPolicy.requireRead(
                election
        );


        return electionMapper.toDTO(
                election
        );
    }


    // ========================================================================
    // LIST ACTIVE ELECTIONS
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<ElectionDto> listActiveElections() {

        Specification<Election> specification =
                Specification
                        .where(
                                ElectionSpecs.activeEquals(
                                        true
                                )
                        )
                        .and(
                                visibilitySpecification()
                        );


        return electionRepository
                .findAll(
                        specification
                )
                .stream()
                .sorted(
                        (a, b) ->
                                b.getDateCreated()
                                        .compareTo(
                                                a.getDateCreated()
                                        )
                )
                .map(
                        electionMapper::toDTO
                )
                .toList();
    }


    // ========================================================================
    // LIST ALL VISIBLE ELECTIONS
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<ElectionDto> listAllElections() {

        /*
         * "All" means:
         *
         * all elections CURRENT CALLER is authorized to see.
         *
         * It does not mean every election row for regular tenants.
         */
        Specification<Election> specification =
                visibilitySpecification();


        return electionRepository
                .findAll(
                        specification
                )
                .stream()
                .map(
                        electionMapper::toDTO
                )
                .toList();
    }


    // ========================================================================
    // SEARCH
    // ========================================================================

    // ========================================================================
// SEARCH
// ========================================================================

    @Override
    @Transactional(readOnly = true)
    public Page<ElectionDto> search(
            ElectionSearchRequest req,
            Pageable pageable
    ) {

        ElectionSearchRequest searchRequest =
                req != null
                        ? req
                        : ElectionSearchRequest.of(
                        null,
                        null,
                        null,
                        null
                );


        Specification<Election> specification =
                Specification
                        .<Election>where(
                                ElectionSpecs.nameContains(
                                        searchRequest.q()
                                )
                        )
                        .and(
                                ElectionSpecs.yearEquals(
                                        searchRequest.year()
                                )
                        )
                        .and(
                                ElectionSpecs.typeEquals(
                                        searchRequest.type()
                                )
                        )
                        .and(
                                ElectionSpecs.activeEquals(
                                        searchRequest.active()
                                )
                        );


        // ====================================================================
        // REQUESTED ACCESS STATUS FILTER
        //
        // IMPORTANT:
        // This narrows results only.
        //
        // It can NEVER override visibilitySpecification().
        // ====================================================================

        if (
                searchRequest.accessStatus() != null
        ) {

            specification =
                    specification.and(
                            (root, query, cb) ->
                                    cb.equal(
                                            root.get("accessStatus"),
                                            searchRequest.accessStatus()
                                    )
                    );
        }


        // ====================================================================
        // TIME FILTERS
        // ====================================================================

        LocalDateTime now =
                LocalDateTime.now();


        // --------------------------------------------------------------------
        // AVAILABLE NOW
        // --------------------------------------------------------------------

        if (
                Boolean.TRUE.equals(
                        searchRequest.availableNow()
                )
        ) {

            specification =
                    specification.and(
                            (root, query, cb) ->
                                    cb.and(

                                            cb.isNotNull(
                                                    root.get("availableAt")
                                            ),

                                            cb.lessThanOrEqualTo(
                                                    root.get("availableAt"),
                                                    now
                                            ),

                                            cb.or(

                                                    cb.isNull(
                                                            root.get("availableUntil")
                                                    ),

                                                    cb.greaterThanOrEqualTo(
                                                            root.get("availableUntil"),
                                                            now
                                                    )
                                            )
                                    )
                    );
        }


        // --------------------------------------------------------------------
        // OPERATIONAL NOW
        // --------------------------------------------------------------------

        if (
                Boolean.TRUE.equals(
                        searchRequest.operationalNow()
                )
        ) {

            specification =
                    specification.and(
                            (root, query, cb) ->
                                    cb.and(

                                            cb.equal(
                                                    root.get("accessStatus"),
                                                    ElectionAccessStatus.AVAILABLE
                                            ),

                                            cb.isTrue(
                                                    root.get("isActive")
                                            ),

                                            cb.isNotNull(
                                                    root.get("startAt")
                                            ),

                                            cb.isNotNull(
                                                    root.get("endAt")
                                            ),

                                            cb.lessThanOrEqualTo(
                                                    root.get("startAt"),
                                                    now
                                            ),

                                            cb.greaterThanOrEqualTo(
                                                    root.get("endAt"),
                                                    now
                                            )
                                    )
                    );
        }


        // --------------------------------------------------------------------
        // POST-ELECTION WINDOW
        // --------------------------------------------------------------------

        if (
                Boolean.TRUE.equals(
                        searchRequest.postElection()
                )
        ) {

            specification =
                    specification.and(
                            (root, query, cb) ->
                                    cb.and(

                                            cb.equal(
                                                    root.get("accessStatus"),
                                                    ElectionAccessStatus.AVAILABLE
                                            ),

                                            cb.isTrue(
                                                    root.get("isActive")
                                            ),

                                            cb.isNotNull(
                                                    root.get("endAt")
                                            ),

                                            cb.isNotNull(
                                                    root.get("availableUntil")
                                            ),

                                            cb.lessThan(
                                                    root.get("endAt"),
                                                    now
                                            ),

                                            cb.greaterThanOrEqualTo(
                                                    root.get("availableUntil"),
                                                    now
                                            )
                                    )
                    );
        }


        // --------------------------------------------------------------------
        // ARCHIVE DUE
        // --------------------------------------------------------------------

        if (
                Boolean.TRUE.equals(
                        searchRequest.archiveDue()
                )
        ) {

            specification =
                    specification.and(
                            (root, query, cb) ->
                                    cb.and(

                                            cb.equal(
                                                    root.get("accessStatus"),
                                                    ElectionAccessStatus.AVAILABLE
                                            ),

                                            cb.isNotNull(
                                                    root.get("availableUntil")
                                            ),

                                            cb.lessThanOrEqualTo(
                                                    root.get("availableUntil"),
                                                    now
                                            )
                                    )
                    );
        }


        // ====================================================================
        // HARD AUTHORIZATION / TENANT VISIBILITY
        // ====================================================================

        /*
         * This is the security boundary.
         *
         * Search filters may narrow results,
         * but they can never expand what the caller is authorized to see.
         *
         * SYSTEM USER:
         *     unrestricted election registry visibility
         *
         * NEC TENANT:
         *     unrestricted lifecycle visibility for valid NEC members
         *
         * REGULAR TENANT:
         *     lifecycle-restricted visibility
         *
         * DRAFT remains hidden from ordinary tenants.
         */
        specification =
                specification.and(
                        visibilitySpecification()
                );


        // ====================================================================
        // EXECUTE
        // ====================================================================

        return electionRepository
                .findAll(
                        specification,
                        pageable
                )
                .map(
                        electionMapper::toDTO
                );
    }

    // ========================================================================
    // ACTIVE / INACTIVE SWITCH
    // ========================================================================

    @Override
    @Transactional
    public ElectionDto setActive(
            UUID electionId,
            boolean active
    ) {

        electionAccessPolicy
                .requireElectionAdministrator();


        Election election =
                requireElection(
                        electionId
                );


        /*
         * isActive is an administrative/technical switch.
         *
         * It must not silently reopen archived or cancelled elections.
         */
        if (
                active &&
                        (
                                election.getAccessStatus()
                                        == ElectionAccessStatus.ARCHIVED
                                        ||
                                        election.getAccessStatus()
                                                == ElectionAccessStatus.CANCELLED
                        )
        ) {

            throw new ResponseStatusException(
                    CONFLICT,
                    "Archived or cancelled election cannot be activated through the active switch"
            );
        }


        election.setActive(
                active
        );


        Election saved =
                electionRepository.save(
                        election
                );


        return electionMapper.toDTO(
                saved
        );
    }


    // ========================================================================
    // ORGANIZATION ELECTION STATS
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public ElectionStatsDto getOrgElectionStats(
            UUID orgId,
            UUID electionId
    ) {

        if (orgId == null) {

            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Organization ID is required"
            );
        }


        Election election =
                requireElection(
                        electionId
                );


        electionAccessPolicy.requireRead(
                election
        );


        /*
         * IMPORTANT:
         *
         * Organization-level authorization must also be enforced.
         *
         * Party A must never be allowed to request Party B's private
         * submission statistics merely by changing orgId.
         *
         * SYSTEM_ADMIN may inspect cross-organization statistics.
         *
         * Organization users are limited to the current organization.
         */
        if (!electionAccessPolicy.isSystemUser()) {

            UUID currentOrgId =
                    currentOrganizationId();


            if (
                    currentOrgId == null ||
                            !currentOrgId.equals(
                                    orgId
                            )
            ) {

                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Organization statistics are restricted to the current organization"
                );
            }
        }


        ElectionStatsProjection projection =
                statsRepository
                        .findOrgElectionStats(
                                orgId,
                                electionId
                        )
                        .orElse(null);


        if (projection == null) {

            return ElectionStatsDto
                    .builder()
                    .orgId(
                            orgId
                    )
                    .electionId(
                            electionId
                    )
                    .registeredVoters(0)
                    .ballotsCast(0)
                    .validVotes(0)
                    .invalidTotal(0)
                    .turnoutPct(
                            BigDecimal.ZERO
                    )
                    .invalidPct(
                            BigDecimal.ZERO
                    )
                    .build();
        }


        return ElectionStatsDto
                .builder()

                .orgId(
                        projection.getOrgId()
                )

                .electionId(
                        projection.getElectionId()
                )

                .registeredVoters(
                        projection.getRegisteredVoters() != null
                                ? projection.getRegisteredVoters()
                                : 0
                )

                .ballotsCast(
                        projection.getBallotsCast() != null
                                ? projection.getBallotsCast()
                                : 0
                )

                .validVotes(
                        projection.getValidVotes() != null
                                ? projection.getValidVotes()
                                : 0
                )

                .invalidTotal(
                        projection.getInvalidTotal() != null
                                ? projection.getInvalidTotal()
                                : 0
                )

                .turnoutPct(
                        projection.getTurnoutPct() != null
                                ? projection.getTurnoutPct()
                                : BigDecimal.ZERO
                )

                .invalidPct(
                        projection.getInvalidPct() != null
                                ? projection.getInvalidPct()
                                : BigDecimal.ZERO
                )

                .build();
    }


    // ========================================================================
    // AUTOMATIC ARCHIVE
    // ========================================================================

    @Override
    @Transactional
    public int archiveExpiredElections() {

        LocalDateTime now =
                LocalDateTime.now();


        /*
         * Internal lifecycle maintenance operation.
         *
         * This method should eventually be invoked by the scheduler,
         * not exposed as an unrestricted public endpoint.
         */
        List<Election> expired =
                electionRepository
                        .findByAccessStatusAndAvailableUntilLessThanEqual(
                                ElectionAccessStatus.AVAILABLE,
                                now
                        );


        if (expired.isEmpty()) {
            return 0;
        }


        for (
                Election election :
                expired
        ) {

            election.setAccessStatus(
                    ElectionAccessStatus.ARCHIVED
            );


            election.setArchivedAt(
                    now
            );


            election.setArchivedReason(
                    "Automatically archived after availability window expired"
            );
        }


        electionRepository.saveAll(
                expired
        );


        return expired.size();
    }


    // ========================================================================
    // HARD VISIBILITY SPECIFICATION
    // ========================================================================

    /**
     * Builds the election visibility boundary for the current caller.
     *
     * This is deliberately applied at DATABASE QUERY LEVEL so paging
     * metadata remains correct.
     *
     *
     * PLATFORM SYSTEM USER
     * --------------------
     * All election lifecycle states may be inspected.
     *
     *
     * NEC ORGANIZATION MEMBER
     * -----------------------
     * All election lifecycle states may be inspected.
     *
     *
     * REGULAR TENANT
     * --------------
     *
     * DRAFT:
     *     hidden
     *
     * AVAILABLE:
     *     isActive = true
     *     availableAt <= now
     *     availableUntil >= now
     *
     * ARCHIVED:
     *     historical visibility
     *
     * CANCELLED:
     *     visible only when it had previously been released
     */
    private Specification<Election> visibilitySpecification() {

        // ====================================================================
        // PLATFORM / SYSTEM DOMAIN
        // ====================================================================

        if (
                electionAccessPolicy
                        .isSystemUser()
        ) {

            return unrestrictedSpecification();
        }


        // ====================================================================
        // ORGANIZATION DOMAIN
        // ====================================================================

        /*
         * This prevents organization type alone from granting access.
         *
         * User must have a REAL enabled membership in the current org.
         */
        authz.requireMembership();


        // ====================================================================
        // NEC TENANT
        // ====================================================================

        if (
                electionAccessPolicy
                        .isNecTenant()
        ) {

            return unrestrictedSpecification();
        }


        // ====================================================================
        // REGULAR TENANT
        // ====================================================================

        LocalDateTime now =
                LocalDateTime.now();


        return (
                root,
                query,
                cb
        ) -> {

            // ---------------------------------------------------------------
            // AVAILABLE
            // ---------------------------------------------------------------

            Predicate available =
                    cb.and(

                            cb.equal(
                                    root.get("accessStatus"),
                                    ElectionAccessStatus.AVAILABLE
                            ),

                            cb.isTrue(
                                    root.get("isActive")
                            ),

                            cb.isNotNull(
                                    root.get("availableAt")
                            ),

                            cb.lessThanOrEqualTo(
                                    root.get("availableAt"),
                                    now
                            ),

                            cb.or(

                                    cb.isNull(
                                            root.get("availableUntil")
                                    ),

                                    cb.greaterThanOrEqualTo(
                                            root.get("availableUntil"),
                                            now
                                    )
                            )
                    );


            // ---------------------------------------------------------------
            // ARCHIVED
            // ---------------------------------------------------------------

            Predicate archived =
                    cb.equal(
                            root.get("accessStatus"),
                            ElectionAccessStatus.ARCHIVED
                    );


            // ---------------------------------------------------------------
            // CANCELLED AFTER RELEASE
            // ---------------------------------------------------------------

            Predicate cancelled =
                    cb.and(

                            cb.equal(
                                    root.get("accessStatus"),
                                    ElectionAccessStatus.CANCELLED
                            ),

                            cb.isNotNull(
                                    root.get("availableAt")
                            ),

                            cb.lessThanOrEqualTo(
                                    root.get("availableAt"),
                                    now
                            )
                    );


            /*
             * DRAFT is intentionally absent.
             */
            return cb.or(
                    available,
                    archived,
                    cancelled
            );
        };
    }


    // ========================================================================
    // UNRESTRICTED SPECIFICATION
    // ========================================================================

    private Specification<Election> unrestrictedSpecification() {

        return (
                root,
                query,
                cb
        ) -> cb.conjunction();
    }


    // ========================================================================
    // TIMELINE VALIDATION
    // ========================================================================

    /**
     * Enforces:
     *
     * availableAt
     *      <=
     * startAt
     *      <=
     * endAt
     *      <=
     * availableUntil
     */
    private void validateTimeline(
            LocalDateTime availableAt,
            LocalDateTime startAt,
            LocalDateTime endAt,
            LocalDateTime availableUntil
    ) {

        if (
                availableAt != null &&
                        startAt != null &&
                        availableAt.isAfter(
                                startAt
                        )
        ) {

            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "availableAt must be before or equal to startAt"
            );
        }


        if (
                startAt != null &&
                        endAt != null &&
                        startAt.isAfter(
                                endAt
                        )
        ) {

            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "startAt must be before or equal to endAt"
            );
        }


        if (
                endAt != null &&
                        availableUntil != null &&
                        endAt.isAfter(
                                availableUntil
                        )
        ) {

            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "endAt must be before or equal to availableUntil"
            );
        }
    }


    // ========================================================================
    // LIFECYCLE TRANSITIONS
    // ========================================================================

    private void validateLifecycleTransition(
            ElectionAccessStatus current,
            ElectionAccessStatus requested
    ) {

        if (
                current == requested
        ) {
            return;
        }


        boolean allowed =
                switch (current) {

                    case DRAFT ->

                            requested
                                    == ElectionAccessStatus.AVAILABLE

                                    ||

                                    requested
                                            == ElectionAccessStatus.CANCELLED;


                    case AVAILABLE ->

                            requested
                                    == ElectionAccessStatus.ARCHIVED

                                    ||

                                    requested
                                            == ElectionAccessStatus.CANCELLED;


                    case CANCELLED ->

                            requested
                                    == ElectionAccessStatus.ARCHIVED;


                    case ARCHIVED ->

                            false;
                };


        if (!allowed) {

            throw new ResponseStatusException(
                    CONFLICT,
                    "Election lifecycle transition from "
                            + current
                            + " to "
                            + requested
                            + " is not allowed"
            );
        }
    }


    // ========================================================================
    // BALLOT POLICY VALIDATION
    // ========================================================================

    private void validateBallotSparePercent(
            Integer percent
    ) {

        if (percent == null) {
            return;
        }


        if (
                percent < 0 ||
                        percent > 100
        ) {

            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "ballotSparePercent must be between 0 and 100"
            );
        }
    }


    // ========================================================================
    // REQUIRE ELECTION
    // ========================================================================

    private Election requireElection(
            UUID electionId
    ) {

        if (electionId == null) {

            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "Election ID is required"
            );
        }


        return electionRepository
                .findById(
                        electionId
                )
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        NOT_FOUND,
                                        "Election not found"
                                )
                );
    }


    // ========================================================================
    // CURRENT ORGANIZATION
    // ========================================================================

    private UUID currentOrganizationId() {

        var context =
                election.ems_backend.tenant.TenantContext.get();


        if (context == null) {
            return null;
        }


        return context
                .orgId()
                .orElse(null);
    }


    // ========================================================================
    // TEXT NORMALIZATION
    // ========================================================================

    private String normalizeRequiredText(
            String value,
            String errorMessage
    ) {

        if (
                value == null ||
                        value.isBlank()
        ) {

            throw new ResponseStatusException(
                    BAD_REQUEST,
                    errorMessage
            );
        }


        return value.trim();
    }


    private String normalizeOptionalText(
            String value
    ) {

        if (
                value == null ||
                        value.isBlank()
        ) {

            return null;
        }


        return value.trim();
    }
}









//package election.ems_backend.service.implement;
//
//
//import election.ems_backend.dto.ElectionCreateRequest;
//import election.ems_backend.dto.ElectionDto;
//import election.ems_backend.dto.ElectionSearchRequest;
//import election.ems_backend.dto.ElectionUpdateRequest;
//import election.ems_backend.entity.Election;
//import election.ems_backend.mapper.ElectionMapper;
//import election.ems_backend.repository.ElectionRepository;
//import election.ems_backend.repository.StatsRepository;
//import election.ems_backend.security.AuthorizationService;
//import election.ems_backend.security.CurrentUserProvider;
//import election.ems_backend.service.AuditLogService;
//import election.ems_backend.service.ElectionService;
//import election.ems_backend.service.ElectionStatsProjection;
//import election.ems_backend.utility.ElectionSpecs;
//import election.ems_backend.utility.ElectionStatsDto;
//import election.ems_backend.tenant.TenantContext;
//import jakarta.persistence.EntityManager;
//import jakarta.persistence.PersistenceContext;
//import lombok.RequiredArgsConstructor;
//import org.springframework.data.domain.Page;
//import org.springframework.data.domain.Pageable;
//import org.springframework.data.jpa.domain.Specification;
//import org.springframework.http.HttpStatus;
//import org.springframework.jdbc.core.JdbcTemplate;
//import org.springframework.stereotype.Service;
//import org.springframework.transaction.annotation.Transactional;
//import org.springframework.web.server.ResponseStatusException;
//
//import java.math.BigDecimal;
//import java.util.List;
//import java.util.UUID;
//
//import static org.springframework.http.HttpStatus.*;
//
//@Service
//@RequiredArgsConstructor
//public class ElectionServiceImplementation implements ElectionService {
//
//    @PersistenceContext
//    EntityManager em;
//
//    private final ElectionRepository electionRepository;
//    private final StatsRepository statsRepository;
//    private final ElectionMapper electionMapper;
//    private final AuthorizationService authz;
//    private final CurrentUserProvider currentUserProvider;
//    private final AuditLogService auditLogService;
//    private final JdbcTemplate jdbc;
//
//    /**
//     * Handles all core business operations for the Election entity.
//     * Provides methods to create, update, delete, retrieve, and search elections.
//     *
//     * <p>This service ensures that:
//     * <ul>
//     *   <li>Each election name and year combination is unique.</li>
//     *   <li>Appropriate HTTP status codes are returned when resources are missing or duplicate.</li>
//     * </ul>
//     * </p>
//     */
//    @Override
//    @Transactional
//    public ElectionDto create(ElectionCreateRequest req) {
//        if (electionRepository.existsByElectionNameIgnoreCaseAndYear(
//                req.getElectionName(), req.getYear())) {
//            throw new ResponseStatusException(
//                    CONFLICT,
//                    "Election '" + req.getElectionName() + "' (" + req.getYear() + ") already exists"
//            );
//        }
//
//        // Build entity from mapper
//        Election entity = electionMapper.toEntity(req);
//
//        // ✅ NEC spare policy (optional, election-level)
//        if (req.getBallotSparePercent() != null) {
//            int p = req.getBallotSparePercent();
//            if (p < 0 || p > 100) {
//                throw new ResponseStatusException(BAD_REQUEST, "ballotSparePercent must be between 0 and 100");
//            }
//            entity.setBallotSparePercent(p);
//        }
//
//        // ✅ Liberia default: enforce ballotsIssued >= registeredVoters unless explicitly disabled
//        if (req.getEnforceBallotsGteRegistered() == null) {
//            entity.setEnforceBallotsGteRegistered(true);
//        } else {
//            entity.setEnforceBallotsGteRegistered(req.getEnforceBallotsGteRegistered());
//        }
//
//        Election saved = electionRepository.save(entity);
//
//        // Audit log (best-effort)
//        try {
//            // Resolve actor user id in a type-safe way
//            UUID actor = null;
//            // 1) prefer currentUserProvider if available
//            try {
//                actor = (currentUserProvider != null ? currentUserProvider.currentUserId() : null);
//            } catch (Exception ignored) {}
//            // 2) fallback to TenantContext if still null
//            if (actor == null) {
//                try {
//                    var ctx = TenantContext.get();
//                    if (ctx != null) actor = ctx.userId().orElse(null);
//                } catch (Exception ignored) {}
//            }
//            String desc = "Created election: " + saved.getElectionName();
//            // (Your audit persistence call would go here if/when you add it)
//        } catch (Exception ignored) {}
//
//        return electionMapper.toDTO(saved);
//    }
//
//
//
//    // ElectionServiceImplementation.java (update)
//    @Override
//    @Transactional
//    public ElectionDto update(UUID electionId, ElectionUpdateRequest req) {
//        Election election = electionRepository.findById(electionId)
//                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Election not found"));
//
//        if (req.getElectionName() != null && !req.getElectionName().trim().isEmpty()) {
//            election.setElectionName(req.getElectionName().trim());
//        }
//
//        if (req.getYear() != null) {
//            Integer year = req.getYear();
//            if (year < 1900) {
//                throw new ResponseStatusException(BAD_REQUEST, "Year must be >= 1900");
//            }
//            election.setYear(year); // entity is int; auto-unbox is safe because year != null
//        }
//
//        if (req.getElectionType() != null) {
//            election.setElectionType(req.getElectionType());
//        }
//
//        if (req.getIsActive() != null) {
//            election.setActive(req.getIsActive());
//        }
//
//        //  ballot spare percent (NEC policy)
//        if (req.getBallotSparePercent() != null) {
//            int p = req.getBallotSparePercent();
//            if (p < 0 || p > 100) {
//                throw new ResponseStatusException(BAD_REQUEST, "ballotSparePercent must be between 0 and 100");
//            }
//            election.setBallotSparePercent(p);
//        }
//
//        //  enforce ballots >= registered voters (NEC policy)
//        if (req.getEnforceBallotsGteRegistered() != null) {
//            election.setEnforceBallotsGteRegistered(req.getEnforceBallotsGteRegistered());
//        }
//
//        Election saved = electionRepository.save(election);
//        return electionMapper.toDTO(saved);
//    }
//
//
//    /**
//     * Deletes an election by its unique identifier.
//     *
//     * @param id the unique identifier of the election to delete.
//     * @throws ResponseStatusException if the election does not exist.
//     */
//    @Override
//    @Transactional
//    public void delete(UUID id) {
//
//        if (!electionRepository.existsById(id)) {
//            throw new ResponseStatusException(NOT_FOUND, "Election not found");
//        }
//
//        // Prevent deletion when official NEC results exist for this election
//        Number cnt = (Number) em.createNativeQuery(
//                        "select count(*) from nec_result where election_id = ?"
//                ).setParameter(1, id) // ✅ FIX: bind UUID, not String
//                .getSingleResult();
//
//        if (cnt != null && cnt.longValue() > 0) {
//            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot delete election with official results");
//        }
//
//        electionRepository.deleteById(id);
//    }
//
//    /**
//     * Retrieves a single election by its unique identifier.
//     *
//     * @param id the unique identifier of the election.
//     * @return a DTO representing the election.
//     * @throws ResponseStatusException if the election is not found.
//     */
//    @Override
//    public ElectionDto get(UUID id) {
//
//        return electionRepository.findById(id)
//                .map(electionMapper::toDTO)
//                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Election not found"));
//    }
//
//
//    @Override
//    public List<ElectionDto> listActiveElections() {
//        List<Election> elections = electionRepository.findByIsActiveTrueOrderByDateCreatedDesc();
//        return elections.stream()
//                .map(electionMapper::toDTO)
//                .toList();
//    }
//
//    @Override
//    public List<ElectionDto> listAllElections() {
//        return electionRepository.findAll().stream()
//                .map(electionMapper::toDTO)
//                .toList();
//    }
//
//    /**
//     * Searches for elections based on filters such as name, year, type, and active status.
//     *
//     * @param req      the search filters encapsulated in an {@link ElectionSearchRequest}.
//     * @param pageable pagination and sorting details.
//     * @return a paginated list of elections that match the given criteria.
//     */
//    @Override
//    public Page<ElectionDto> search(ElectionSearchRequest req, Pageable pageable) {
//        Specification<Election> spec = Specification
//                .where(ElectionSpecs.nameContains(req.q()))
//                .and(ElectionSpecs.yearEquals(req.year()))
//                .and(ElectionSpecs.typeEquals(req.type()))
//                .and(ElectionSpecs.activeEquals(req.active()));
//
//        return electionRepository.findAll(spec, pageable)
//                .map(electionMapper::toDTO);
//    }
//
//    @Override
//    @Transactional
//    public ElectionDto setActive(UUID id, boolean active) {
//        Election e = electionRepository.findById(id)
//                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Election not found"));
//        e.setActive(active);
//        return electionMapper.toDTO(electionRepository.save(e));
//    }
//
//
//    @Override
//    public ElectionStatsDto getOrgElectionStats(UUID orgId, UUID electionId) {
//        ElectionStatsProjection p = statsRepository
//                .findOrgElectionStats(orgId, electionId)
//                .orElse(null);
//
//        if (p == null) {
//            // No row yet → return empty stats instead of error
//            return ElectionStatsDto.builder()
//                    .orgId(orgId)
//                    .electionId(electionId)
//                    .registeredVoters(0)
//                    .ballotsCast(0)
//                    .validVotes(0)
//                    .invalidTotal(0)
//                    .turnoutPct(BigDecimal.ZERO)
//                    .invalidPct(BigDecimal.ZERO)
//                    .build();
//        }
//
//        return ElectionStatsDto.builder()
//                .orgId(p.getOrgId())
//                .electionId(p.getElectionId())
//                .registeredVoters(p.getRegisteredVoters() != null ? p.getRegisteredVoters() : 0)
//                .ballotsCast(p.getBallotsCast() != null ? p.getBallotsCast() : 0)
//                .validVotes(p.getValidVotes() != null ? p.getValidVotes() : 0)
//                .invalidTotal(p.getInvalidTotal() != null ? p.getInvalidTotal() : 0)
//                .turnoutPct(p.getTurnoutPct() != null ? p.getTurnoutPct() : BigDecimal.ZERO)
//                .invalidPct(p.getInvalidPct() != null ? p.getInvalidPct() : BigDecimal.ZERO)
//                .build();
//    }
//
//
//
//
//
//}
