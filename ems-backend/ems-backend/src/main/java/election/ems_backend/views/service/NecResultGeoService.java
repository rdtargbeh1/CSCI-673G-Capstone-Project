package election.ems_backend.views.service;

import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.NecResultGeoSpecs;
import election.ems_backend.views.dto.NecResultGeoDto;
import election.ems_backend.views.entity.NecResultGeo;
import election.ems_backend.views.mapper.NecResultGeoMapper;
import election.ems_backend.views.repo.NecResultGeoRepository;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NecResultGeoService {

    private static final Logger log = LoggerFactory.getLogger(NecResultGeoService.class);

    private final NecResultGeoRepository repo;
    private final ElectionValidationService electionValidationService;
    private final TenantGucService tenantGucService;
    private final MeterRegistry meterRegistry;
    private final NecResultGeoMapper mapper = new NecResultGeoMapper();


    @Transactional(readOnly = true)
    @Cacheable(
            value = "necResultGeo",
            key = "T(java.lang.String).valueOf(#electionId)"
                    + " + ':' + (#contestId==null?'':#contestId)" // ✅ NEW
                    + " + ':' + (#countyId==null?'':#countyId)"
                    + " + ':' + (#districtId==null?'':#districtId)"
                    + " + ':' + (#centerId==null?'':#centerId)"
                    + " + ':' + (#uploadedAfter==null?'':#uploadedAfter.toInstant().toEpochMilli())"
                    + " + ':' + (#uploadedBefore==null?'':#uploadedBefore.toInstant().toEpochMilli())"
                    + " + ':' + #pageable.pageNumber + ':' + #pageable.pageSize + ':' + #pageable.sort"
    )
    public Page<NecResultGeoDto> listNecResultGeo(
            UUID electionId,
            UUID contestId, // ✅ NEW
            UUID countyId,
            UUID districtId,
            UUID centerId,
            OffsetDateTime uploadedAfter,
            OffsetDateTime uploadedBefore,
            Pageable pageable
    ) {
        log.debug("listNecResultGeo called electionId={} contestId={} countyId={} districtId={} centerId={} uploadedAfter={} uploadedBefore={} page={} size={}",
                electionId, contestId, countyId, districtId, centerId, uploadedAfter, uploadedBefore,
                pageable.getPageNumber(), pageable.getPageSize());

        if (electionId == null) throw new IllegalArgumentException("electionId is required");
        electionValidationService.ensureExists(electionId);

        // Apply tenant GUC if caller in org context (keeps RLS consistent)
        UUID derivedOrgId = SecurityUtils.getOrgIdFromContext();
        if (derivedOrgId != null) {
            tenantGucService.applyForTransaction(derivedOrgId, false, false);
        } else {
            tenantGucService.applyForTransaction((java.util.UUID) null, false, false);
        }

        Specification<NecResultGeo> spec = Specification
                .where(NecResultGeoSpecs.electionEquals(electionId))
                .and(NecResultGeoSpecs.contestEquals(contestId)) // ✅ NEW (you must add this spec)
                .and(NecResultGeoSpecs.countyEquals(countyId))
                .and(NecResultGeoSpecs.districtEquals(districtId))
                .and(NecResultGeoSpecs.centerEquals(centerId))
                .and(NecResultGeoSpecs.uploadedAfter(uploadedAfter))
                .and(NecResultGeoSpecs.uploadedBefore(uploadedBefore));

        Page<NecResultGeo> page = repo.findAll((Specification<NecResultGeo>) spec, pageable);

        meterRegistry.gauge("api.stats.official.nec_geo.result_size", page.getContent(), c -> (double) c.size());
        return page.map(mapper::toDto);
    }


}