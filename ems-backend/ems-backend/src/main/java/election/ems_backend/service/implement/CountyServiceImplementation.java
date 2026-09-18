
package election.ems_backend.service.implement;

import election.ems_backend.dto.CountyDto;
import election.ems_backend.dto.CountyRequest;
import election.ems_backend.entity.County;
import election.ems_backend.mapper.CountyMapper;
import election.ems_backend.repository.CountyRepository;
import election.ems_backend.service.CountyService;

import jakarta.persistence.EntityExistsException;
import jakarta.persistence.EntityNotFoundException;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class CountyServiceImplementation implements CountyService {

    private final CountyRepository countyRepository;

    private final CountyMapper countyMapper =
            new CountyMapper();

    // ========================================================================
    // CREATE
    // ========================================================================

    @Override
    public CountyDto create(
            CountyRequest request
    ) {

        String countyName =
                validateAndNormalize(
                        request.countyName()
                );

        guardUnique(
                countyName,
                null
        );

        County county =
                countyMapper.toEntity(
                        new CountyRequest(
                                countyName
                        )
                );

        County saved =
                countyRepository.save(
                        county
                );

        return countyMapper.toDTO(
                saved
        );
    }

    // ========================================================================
    // UPDATE
    // ========================================================================

    @Override
    public CountyDto update(
            UUID id,
            CountyRequest request
    ) {

        County county =
                countyRepository
                        .findById(
                                id
                        )
                        .orElseThrow(() ->
                                new EntityNotFoundException(
                                        "County not found"
                                )
                        );

        String countyName =
                validateAndNormalize(
                        request.countyName()
                );

        guardUnique(
                countyName,
                id
        );

        countyMapper.updateEntity(
                county,
                new CountyRequest(
                        countyName
                )
        );

        County saved =
                countyRepository.save(
                        county
                );

        return countyMapper.toDTO(
                saved
        );
    }

    // ========================================================================
    // DELETE
    // ========================================================================

    @Override
    public void delete(
            UUID countyId
    ) {

        if (
                !countyRepository
                        .existsById(
                                countyId
                        )
        ) {

            throw new EntityNotFoundException(
                    "County not found"
            );
        }

        countyRepository
                .deleteById(
                        countyId
                );
    }

    // ========================================================================
    // GET
    //
    // County is global geography reference data.
    // It is not owned by an Election.
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public CountyDto get(
            UUID countyId
    ) {

        County county =
                countyRepository
                        .findById(
                                countyId
                        )
                        .orElseThrow(() ->
                                new EntityNotFoundException(
                                        "County not found"
                                )
                        );

        return countyMapper.toDTO(
                county
        );
    }

    // ========================================================================
    // GET - COMPATIBILITY OVERLOAD
    //
    // electionId is intentionally ignored because County is global geography.
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public CountyDto get(
            UUID countyId,
            UUID electionId
    ) {

        return get(
                countyId
        );
    }

    // ========================================================================
    // LIST
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public Page<CountyDto> list(
            String q,
            Pageable pageable
    ) {

        Specification<County> spec =
                (root, query, cb) -> {

                    if (
                            q == null
                                    ||
                                    q.isBlank()
                    ) {

                        return cb.conjunction();
                    }

                    return cb.like(
                            cb.lower(
                                    root.get(
                                            "countyName"
                                    )
                            ),
                            "%"
                                    + q.trim().toLowerCase()
                                    + "%"
                    );
                };

        return countyRepository
                .findAll(
                        spec,
                        pageable
                )
                .map(
                        countyMapper::toDTO
                );
    }

    // ========================================================================
    // LIST - COMPATIBILITY OVERLOAD
    //
    // electionId is intentionally ignored because County is global geography.
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public Page<CountyDto> list(
            String q,
            UUID electionId,
            Pageable pageable
    ) {

        return list(
                q,
                pageable
        );
    }

    // ========================================================================
    // VALIDATE / NORMALIZE
    // ========================================================================

    private String validateAndNormalize(
            String raw
    ) {

        if (raw == null) {

            throw new IllegalArgumentException(
                    "countyName is required"
            );
        }

        String name =
                raw.trim();

        if (name.isEmpty()) {

            throw new IllegalArgumentException(
                    "countyName cannot be blank"
            );
        }

        if (name.length() > 100) {

            throw new IllegalArgumentException(
                    "countyName max length is 100"
            );
        }

        return name;
    }

    // ========================================================================
    // UNIQUE NAME
    // ========================================================================

    private void guardUnique(
            String name,
            UUID selfId
    ) {

        boolean exists =
                countyRepository
                        .existsByCountyNameIgnoreCase(
                                name
                        );

        if (!exists) {
            return;
        }

        if (selfId != null) {

            County current =
                    countyRepository
                            .findById(
                                    selfId
                            )
                            .orElse(
                                    null
                            );

            if (
                    current != null
                            &&
                            current.getCountyName()
                                    .equalsIgnoreCase(
                                            name
                                    )
            ) {

                return;
            }
        }

        throw new EntityExistsException(
                "County name already exists: "
                        + name
        );
    }
}







//package election.ems_backend.service.implement;
//
//import election.ems_backend.dto.CountyDto;
//import election.ems_backend.dto.CountyRequest;
//import election.ems_backend.entity.County;
//import election.ems_backend.mapper.CountyMapper;
//import election.ems_backend.policy.OperationResourcePolicy;
//import election.ems_backend.policy.OperationRolePolicy;
//import election.ems_backend.policy.OperationScopeSpecifications;
//import election.ems_backend.repository.CountyRepository;
//import election.ems_backend.service.CountyService;
//import jakarta.persistence.EntityExistsException;
//import jakarta.persistence.EntityNotFoundException;
//import lombok.RequiredArgsConstructor;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.data.domain.Page;
//import org.springframework.data.domain.Pageable;
//import org.springframework.data.jpa.domain.Specification;
//import org.springframework.security.access.AccessDeniedException;
//import org.springframework.web.server.ResponseStatusException;
//import org.springframework.stereotype.Service;
//import org.springframework.transaction.annotation.Transactional;
//
//import java.util.UUID;
//
//import static org.springframework.http.HttpStatus.BAD_REQUEST;
//
//@Service
//@RequiredArgsConstructor
//@Transactional
//public class CountyServiceImplementation implements CountyService {
//
//    @Autowired
//    private CountyRepository countyRepository;
//    @Autowired
//    private CountyMapper countyMapper = new CountyMapper();
//
//    private final OperationRolePolicy operationRolePolicy;
//    private final OperationResourcePolicy operationResourcePolicy;
//    private final OperationScopeSpecifications operationScopeSpecifications;
//
//
//    @Override
//    public CountyDto create(CountyRequest request) {
//        if (countyRepository.existsByCountyNameIgnoreCase(request.countyName()))
//            throw new EntityExistsException("County already exists: " + request.countyName());
//
//        County county = countyMapper.toEntity(request);
//        county = countyRepository.save(county);
//        return countyMapper.toDTO(county);
//    }
//
//    @Override
//    public CountyDto update(UUID id, CountyRequest request) {
//        County county = countyRepository.findById(id)
//                .orElseThrow(() -> new EntityNotFoundException("County not found"));
//        countyMapper.updateEntity(county, request);
//        return countyMapper.toDTO(countyRepository.save(county));
//    }
//
//
//    @Override
//    public void delete(UUID countyId) {
//        if (!countyRepository.existsById(countyId)) throw new EntityNotFoundException("County not found");
//        countyRepository.deleteById(countyId);
//    }
//
//    @Override
//    @Transactional(readOnly = true)
//    public CountyDto get(UUID countyId) {
//        return get(countyId, null);
//    }
//
//    @Override
//    @Transactional(readOnly = true)
//    public CountyDto get(UUID countyId, UUID electionId) {
//        County entity = countyRepository.findById(countyId)
//                .orElseThrow(() -> new EntityNotFoundException("County not found"));
//
//        if (operationRolePolicy.isOperationalRole()) {
//            requireElectionId(electionId);
//
//            if (!operationResourcePolicy.canViewCounty(electionId, entity.getCountyId())) {
//                throw new AccessDeniedException("User does not have access to this county");
//            }
//        }
//
//        return countyMapper.toDTO(entity);
//    }
//
//    @Override
//    @Transactional(readOnly = true)
//    public Page<CountyDto> list(String q, Pageable pageable) {
//        return list(q, null, pageable);
//    }
//
//    @Override
//    @Transactional(readOnly = true)
//    public Page<CountyDto> list(String q, UUID electionId, Pageable pageable) {
//        Specification<County> spec = (root, query, cb) -> {
//            if (q == null || q.isBlank()) {
//                return cb.conjunction();
//            }
//
//            return cb.like(
//                    cb.lower(root.get("countyName")),
//                    "%" + q.trim().toLowerCase() + "%"
//            );
//        };
//
//        if (operationRolePolicy.isOperationalRole()) {
//            requireElectionId(electionId);
//            spec = spec.and(operationScopeSpecifications.counties(electionId));
//        }
//
//        return countyRepository.findAll(spec, pageable).map(countyMapper::toDTO);
//    }
//
//    private void requireElectionId(UUID electionId) {
//        if (electionId == null) {
//            throw new ResponseStatusException(
//                    BAD_REQUEST,
//                    "Election ID required for operational geography access"
//            );
//        }
//    }
//
//    private String validateAndNormalize(String raw) {
//        if (raw == null) throw new IllegalArgumentException("countyName is required");
//        String name = raw.trim();
//        if (name.isEmpty()) throw new IllegalArgumentException("countyName cannot be blank");
//        if (name.length() > 100) throw new IllegalArgumentException("countyName max length is 100");
//        return name;
//    }
//
//    private void guardUnique(String name, UUID selfId) {
//        boolean exists = countyRepository.existsByCountyNameIgnoreCase(name);
//        if (!exists) return;
//        if (selfId != null) {
//            County current = countyRepository.findById(selfId).orElse(null);
//            if (current != null && current.getCountyName().equalsIgnoreCase(name)) return;
//        }
//        throw new EntityExistsException("County name already exists: " + name);
//    }
//
//
//}
