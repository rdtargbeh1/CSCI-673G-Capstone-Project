package election.ems_backend.views.contro;

import election.ems_backend.views.dto.NecResultGeoDto;
import election.ems_backend.views.service.NecResultGeoService;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Public controller exposing NEC published nec_result geo rows.
 * Endpoint: GET /api/stats/official/nec/geo
 */
@RestController
@RequestMapping("/api/stats/official/nec/geo")
@RequiredArgsConstructor
@Validated
public class NecResultGeoController {

    private static final Logger log = LoggerFactory.getLogger(NecResultGeoController.class);

    private final NecResultGeoService service;
    private final MeterRegistry meterRegistry;

    private static final int MAX_PAGE_SIZE = 2000;
    private static final int DEFAULT_PAGE_SIZE = 100;

    @GetMapping
    public ResponseEntity<Page<NecResultGeoDto>> list(
            @RequestParam(value = "electionId") UUID electionId,
            @RequestParam(value = "contestId", required = false) UUID contestId, // ✅ NEW
            @RequestParam(value = "countyId", required = false) UUID countyId,
            @RequestParam(value = "districtId", required = false) UUID districtId,
            @RequestParam(value = "centerId", required = false) UUID centerId,
            @RequestParam(value = "uploadedAfter", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime uploadedAfter,
            @RequestParam(value = "uploadedBefore", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime uploadedBefore,
            @RequestParam(value = "page", required = false, defaultValue = "0") @Min(0) int page,
            @RequestParam(value = "size", required = false) Integer size,
            @RequestParam(value = "sort", required = false) String[] sort
    ) {
        if (electionId == null) return ResponseEntity.badRequest().build();

        int requestedSize = size == null ? DEFAULT_PAGE_SIZE : size;
        int pageSize = Math.min(Math.max(1, requestedSize), MAX_PAGE_SIZE);

        Sort sortObj = Sort.by(Sort.Order.desc("uploadTime")); // default: newest first
        if (sort != null && sort.length > 0) {
            Sort.Order[] orders = new Sort.Order[sort.length];
            for (int i = 0; i < sort.length; i++) {
                String s = sort[i];
                String[] parts = s.split(",");
                if (parts.length == 1) orders[i] = Sort.Order.asc(parts[0].trim());
                else orders[i] = new Sort.Order(Sort.Direction.fromString(parts[1].trim()), parts[0].trim());
            }
            sortObj = Sort.by(orders);
        }

        Pageable pageable = PageRequest.of(page, pageSize, sortObj);

        log.debug("Controller list nec geo electionId={} contestId={} countyId={} districtId={} centerId={} uploadedAfter={} uploadedBefore={} page={} size={} sort={}",
                electionId, contestId, countyId, districtId, centerId, uploadedAfter, uploadedBefore, page, pageSize, sortObj);

        meterRegistry.counter("api.stats.official.nec_geo.controller.requests",
                "endpoint", "/api/stats/official/nec/geo").increment();

        Page<NecResultGeoDto> result = service.listNecResultGeo(
                electionId,
                contestId, // ✅ NEW
                countyId,
                districtId,
                centerId,
                uploadedAfter,
                uploadedBefore,
                pageable
        );
        return ResponseEntity.ok(result);
    }
}