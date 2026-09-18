package election.ems_backend.service.implement;

import election.ems_backend.dto.DistrictDto;
import election.ems_backend.dto.DistrictRequest;
import election.ems_backend.entity.County;
import election.ems_backend.entity.District;
import election.ems_backend.mapper.DistrictMapper;
import election.ems_backend.repository.CountyRepository;
import election.ems_backend.repository.DistrictRepository;
import election.ems_backend.service.DistrictService;

import jakarta.persistence.EntityExistsException;
import jakarta.persistence.EntityNotFoundException;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class DistrictServiceImplementation implements DistrictService {

    private final DistrictRepository districtRepo;
    private final CountyRepository countyRepository;

    private final DistrictMapper districtMapper =
            new DistrictMapper();

    // ========================================================================
    // CREATE
    // ========================================================================

    @Override
    public DistrictDto create(
            DistrictRequest req
    ) {

        County county =
                countyRepository
                        .findById(
                                req.countyId()
                        )
                        .orElseThrow(() ->
                                new EntityNotFoundException(
                                        "County not found"
                                )
                        );

        guardUnique(
                req.districtName(),
                county.getCountyId(),
                null
        );

        District district =
                districtMapper.toEntity(
                        req,
                        county
                );

        District saved =
                districtRepo.save(
                        district
                );

        return districtMapper.toDTO(
                saved
        );
    }

    // ========================================================================
    // UPDATE
    // ========================================================================

    @Override
    public DistrictDto update(
            UUID districtId,
            DistrictRequest req
    ) {

        District district =
                districtRepo
                        .findById(
                                districtId
                        )
                        .orElseThrow(() ->
                                new EntityNotFoundException(
                                        "District not found"
                                )
                        );

        County county =
                countyRepository
                        .findById(
                                req.countyId()
                        )
                        .orElseThrow(() ->
                                new EntityNotFoundException(
                                        "County not found"
                                )
                        );

        guardUnique(
                req.districtName(),
                county.getCountyId(),
                districtId
        );

        districtMapper.updateEntity(
                district,
                req,
                county
        );

        District saved =
                districtRepo.save(
                        district
                );

        return districtMapper.toDTO(
                saved
        );
    }

    // ========================================================================
    // DELETE
    // ========================================================================

    @Override
    public void delete(
            UUID districtId
    ) {

        if (
                !districtRepo
                        .existsById(
                                districtId
                        )
        ) {

            throw new EntityNotFoundException(
                    "District not found"
            );
        }

        districtRepo
                .deleteById(
                        districtId
                );
    }

    // ========================================================================
    // GET
    //
    // District is global geography reference data.
    // It is not owned by an Election.
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public DistrictDto get(
            UUID districtId
    ) {

        District district =
                districtRepo
                        .findById(
                                districtId
                        )
                        .orElseThrow(() ->
                                new EntityNotFoundException(
                                        "District not found"
                                )
                        );

        return districtMapper.toDTO(
                district
        );
    }

    // ========================================================================
    // GET - COMPATIBILITY OVERLOAD
    //
    // electionId is intentionally ignored because District is global geography.
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public DistrictDto get(
            UUID districtId,
            UUID electionId
    ) {

        return get(
                districtId
        );
    }

    // ========================================================================
    // LIST
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public Page<DistrictDto> list(
            String q,
            UUID countyId,
            Pageable pageable
    ) {

        Specification<District> spec =
                (root, query, cb) -> {

                    var predicate =
                            cb.conjunction();

                    if (countyId != null) {

                        predicate =
                                cb.and(
                                        predicate,
                                        cb.equal(
                                                root.get("county")
                                                        .get("countyId"),
                                                countyId
                                        )
                                );
                    }

                    if (
                            q != null
                                    &&
                                    !q.isBlank()
                    ) {

                        predicate =
                                cb.and(
                                        predicate,
                                        cb.like(
                                                cb.lower(
                                                        root.get(
                                                                "districtName"
                                                        )
                                                ),
                                                "%"
                                                        + q.trim()
                                                        .toLowerCase()
                                                        + "%"
                                        )
                                );
                    }

                    return predicate;
                };

        return districtRepo
                .findAll(
                        spec,
                        pageable
                )
                .map(
                        districtMapper::toDTO
                );
    }

    // ========================================================================
    // LIST - COMPATIBILITY OVERLOAD
    //
    // electionId is intentionally ignored.
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public Page<DistrictDto> list(
            String q,
            UUID countyId,
            UUID electionId,
            Pageable pageable
    ) {

        return list(
                q,
                countyId,
                pageable
        );
    }

    // ========================================================================
    // LIST BY COUNTY
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<DistrictDto> listByCounty(
            UUID countyId
    ) {

        return districtRepo
                .findByCounty_CountyIdOrderByDistrictNameAsc(
                        countyId
                )
                .stream()
                .map(
                        districtMapper::toDTO
                )
                .toList();
    }

    // ========================================================================
    // LIST BY COUNTY - COMPATIBILITY OVERLOAD
    //
    // electionId is intentionally ignored.
    // ========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<DistrictDto> listByCounty(
            UUID countyId,
            UUID electionId
    ) {

        return listByCounty(
                countyId
        );
    }

    // ========================================================================
    // UNIQUE DISTRICT
    // ========================================================================

    private void guardUnique(
            String name,
            UUID countyId,
            UUID selfId
    ) {

        boolean exists =
                districtRepo
                        .existsByDistrictNameIgnoreCaseAndCounty_CountyId(
                                name.trim(),
                                countyId
                        );

        if (!exists) {
            return;
        }

        if (selfId != null) {

            District current =
                    districtRepo
                            .findById(
                                    selfId
                            )
                            .orElse(
                                    null
                            );

            if (
                    current != null
                            &&
                            current.getCounty() != null
                            &&
                            current.getCounty()
                                    .getCountyId()
                                    .equals(
                                            countyId
                                    )
                            &&
                            current.getDistrictName()
                                    .equalsIgnoreCase(
                                            name
                                    )
            ) {

                return;
            }
        }

        throw new EntityExistsException(
                "District '"
                        + name
                        + "' already exists in this county"
        );
    }
}



//package election.ems_backend.service.implement;
//
//import election.ems_backend.dto.DistrictDto;
//import election.ems_backend.dto.DistrictRequest;
//import election.ems_backend.entity.County;
//import election.ems_backend.entity.District;
//import election.ems_backend.mapper.DistrictMapper;
//import election.ems_backend.policy.OperationResourcePolicy;
//import election.ems_backend.policy.OperationRolePolicy;
//import election.ems_backend.policy.OperationScopeSpecifications;
//import election.ems_backend.repository.CountyRepository;
//import election.ems_backend.repository.DistrictRepository;
//import election.ems_backend.service.DistrictService;
//import jakarta.persistence.EntityExistsException;
//import jakarta.persistence.EntityNotFoundException;
//import lombok.RequiredArgsConstructor;
//import org.springframework.data.domain.Page;
//import org.springframework.data.domain.Pageable;
//import org.springframework.data.domain.Sort;
//import org.springframework.data.jpa.domain.Specification;
//import org.springframework.security.access.AccessDeniedException;
//import org.springframework.web.server.ResponseStatusException;
//import org.springframework.stereotype.Service;
//import org.springframework.transaction.annotation.Transactional;
//
//import java.util.List;
//import java.util.UUID;
//
//import static org.springframework.http.HttpStatus.BAD_REQUEST;
//
//@Service
//@RequiredArgsConstructor
//@Transactional
//public class DistrictServiceImplementation implements DistrictService {
//
//    private final DistrictRepository districtRepo;
//    private final CountyRepository countyRepository;
//    private final OperationRolePolicy operationRolePolicy;
//    private final OperationResourcePolicy operationResourcePolicy;
//    private final OperationScopeSpecifications operationScopeSpecifications;
//    private final DistrictMapper districtMapper = new DistrictMapper();
//
//    @Override
//    public DistrictDto create(DistrictRequest req) {
//        County county = countyRepository.findById(req.countyId())
//                .orElseThrow(() -> new EntityNotFoundException("County not found"));
//
//        guardUnique(req.districtName(), county.getCountyId(), null);
//
//        District d = districtMapper.toEntity(req, county);
//        d = districtRepo.save(d);
//        return districtMapper.toDTO(d);
//    }
//
//    @Override
//    public DistrictDto update(UUID districtId, DistrictRequest req) {
//        District d = districtRepo.findById(districtId)
//                .orElseThrow(() -> new EntityNotFoundException("District not found"));
//
//        County county = countyRepository.findById(req.countyId())
//                .orElseThrow(() -> new EntityNotFoundException("County not found"));
//
//        guardUnique(req.districtName(), county.getCountyId(), districtId);
//
//        districtMapper.updateEntity(d, req, county);
//        return districtMapper.toDTO(d);
//    }
//
//    @Override
//    public void delete(UUID districtId) {
//        if (!districtRepo.existsById(districtId))
//            throw new EntityNotFoundException("District not found");
//        districtRepo.deleteById(districtId);
//    }
//
//    @Override
//    @Transactional(readOnly = true)
//    public DistrictDto get(UUID districtId) {
//        return get(districtId, null);
//    }
//
//    @Override
//    @Transactional(readOnly = true)
//    public DistrictDto get(UUID districtId, UUID electionId) {
//        District district = districtRepo.findById(districtId)
//                .orElseThrow(() -> new EntityNotFoundException("District not found"));
//
//        if (operationRolePolicy.isOperationalRole()) {
//            requireElectionId(electionId);
//
//            UUID countyId = district.getCounty() != null
//                    ? district.getCounty().getCountyId()
//                    : null;
//
//            if (!operationResourcePolicy.canViewDistrict(
//                    electionId,
//                    countyId,
//                    district.getDistrictId()
//            )) {
//                throw new AccessDeniedException("User does not have access to this district");
//            }
//        }
//
//        return districtMapper.toDTO(district);
//    }
//
//    @Override
//    @Transactional(readOnly = true)
//    public Page<DistrictDto> list(String q, UUID countyId, Pageable pageable) {
//        return list(q, countyId, null, pageable);
//    }
//
//    @Override
//    @Transactional(readOnly = true)
//    public Page<DistrictDto> list(
//            String q,
//            UUID countyId,
//            UUID electionId,
//            Pageable pageable
//    ) {
//        Specification<District> spec = (root, query, cb) -> {
//            var predicate = cb.conjunction();
//
//            if (countyId != null) {
//                predicate = cb.and(
//                        predicate,
//                        cb.equal(root.get("county").get("countyId"), countyId)
//                );
//            }
//
//            if (q != null && !q.isBlank()) {
//                predicate = cb.and(
//                        predicate,
//                        cb.like(
//                                cb.lower(root.get("districtName")),
//                                "%" + q.trim().toLowerCase() + "%"
//                        )
//                );
//            }
//
//            return predicate;
//        };
//
//        if (operationRolePolicy.isOperationalRole()) {
//            requireElectionId(electionId);
//            spec = spec.and(operationScopeSpecifications.districts(electionId));
//        }
//
//        return districtRepo.findAll(spec, pageable).map(districtMapper::toDTO);
//    }
//
//    private void guardUnique(String name, UUID countyId, UUID selfId) {
//        boolean exists = districtRepo.existsByDistrictNameIgnoreCaseAndCounty_CountyId(name.trim(), countyId);
//        if (!exists) return;
//
//        // If updating, allow same name if it belongs to this district
//        if (selfId != null) {
//            District current = districtRepo.findById(selfId).orElse(null);
//            if (current != null
//                    && current.getCounty() != null
//                    && current.getCounty().getCountyId().equals(countyId)
//                    && current.getDistrictName().equalsIgnoreCase(name)) {
//                return;
//            }
//        }
//        throw new EntityExistsException("District '" + name + "' already exists in this county");
//    }
//
//    @Override
//    @Transactional(readOnly = true)
//    public List<DistrictDto> listByCounty(UUID countyId) {
//        return listByCounty(countyId, null);
//    }
//
//    @Override
//    @Transactional(readOnly = true)
//    public List<DistrictDto> listByCounty(UUID countyId, UUID electionId) {
//        if (!operationRolePolicy.isOperationalRole()) {
//            return districtRepo
//                    .findByCounty_CountyIdOrderByDistrictNameAsc(countyId)
//                    .stream()
//                    .map(districtMapper::toDTO)
//                    .toList();
//        }
//
//        requireElectionId(electionId);
//
//        Specification<District> spec = (root, query, cb) ->
//                cb.equal(root.get("county").get("countyId"), countyId);
//
//        spec = spec.and(operationScopeSpecifications.districts(electionId));
//
//        return districtRepo
//                .findAll(spec, Sort.by("districtName").ascending())
//                .stream()
//                .map(districtMapper::toDTO)
//                .toList();
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
//}
